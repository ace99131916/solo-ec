'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { readLocalCart } from '@/lib/cart';
import { mockProducts } from '@/lib/mock';
import CvsPicker, { type CvsSelection } from '@/components/CvsPicker';

type Line = { sku_id: string; qty: number; spec_name: string; price: number; product_name: string };

const COUPON_KEY = 'solo-ec-coupon';

const skuMap = new Map(
  mockProducts.flatMap((p) => p.skus.map((s) => [s.id, { ...s, product_name: p.name }]))
);

// 結帳：左表單右明細，送單走 place_order RPC，再以 fetch+token 取綠界付款單
export default function CheckoutPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [method, setMethod] = useState<'home' | 'cvs'>('home');
  const [cvs, setCvs] = useState<CvsSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [coupon, setCoupon] = useState('');
  const [filteredNote, setFilteredNote] = useState('');

  // 送單前驗證：下架 / 缺貨 / 價格異常品項先剔除並告知，不等 RPC 報錯
  async function verifyLines(raw: Line[]) {
    if (!raw.length) { setLines([]); return; }
    try {
      const sb = createClient();
      const { data } = await sb.from('product_skus').select('id,price,stock,is_active').in('id', raw.map((l) => l.sku_id));
      const m = new Map((data ?? []).map((r: any) => [r.id, r]));
      const ok: Line[] = [];
      let dropped = 0;
      for (const l of raw) {
        const s = m.get(l.sku_id) as any;
        if (!s || s.is_active === false || (s.stock ?? 0) <= 0 || (s.price ?? 0) <= 0) { dropped++; continue; }
        ok.push({ ...l, price: s.price, qty: Math.min(l.qty, s.stock) });
      }
      setLines(ok);
      setFilteredNote(dropped > 0 ? `有 ${dropped} 項商品已下架或缺貨，已自動移出本次結帳，請回購物車確認。` : '');
    } catch {
      setLines(raw);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        try { setCoupon(localStorage.getItem(COUPON_KEY) ?? ''); } catch {}
        const sb = createClient();
        const { data } = await sb.auth.getUser();
        setAuthed(!!data.user);
        const raw = localStorage.getItem('solo-ec-cvs');
        if (raw) setCvs(JSON.parse(raw));
        // 明細：先雲端購物車，空則用本機
        if (data.user) {
          const { data: rows } = await sb
            .from('cart_items')
            .select('sku_id,qty,product_skus(spec_name,price,products(name))');
          if (rows?.length) {
            await verifyLines(
              rows.map((r: any) => ({
                sku_id: r.sku_id, qty: r.qty,
                spec_name: r.product_skus?.spec_name ?? '?',
                price: r.product_skus?.price ?? 0,
                product_name: r.product_skus?.products?.name ?? '商品',
              }))
            );
            return;
          }
        }
        const local = readLocalCart();
        const base: Line[] = local.map((l) => {
          const m = skuMap.get(l.sku_id);
          return {
            sku_id: l.sku_id, qty: l.qty,
            spec_name: m?.spec_name ?? l.sku_id, price: m?.price ?? 0,
            product_name: m?.product_name ?? '商品',
          };
        });
        setLines(base);
        const unknown = local.filter((l) => !skuMap.get(l.sku_id)).map((l) => l.sku_id);
        if (unknown.length) {
          const { data: skus } = await sb
            .from('product_skus')
            .select('id,spec_name,price,products(name)')
            .in('id', unknown);
          if (skus?.length) {
            const m = new Map((skus as any[]).map((r: any) => [r.id, r]));
            await verifyLines(
              local.map((l) => {
                const hit = m.get(l.sku_id) as any;
                const mock = skuMap.get(l.sku_id);
                return {
                  sku_id: l.sku_id, qty: l.qty,
                  spec_name: hit?.spec_name ?? mock?.spec_name ?? l.sku_id,
                  price: hit?.price ?? mock?.price ?? 0,
                  product_name: hit?.products?.name ?? mock?.product_name ?? '商品',
                };
              })
            );
          } else {
            await verifyLines(base);
          }
        } else {
          await verifyLines(base);
        }
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);
  const discount = coupon.trim().toUpperCase() === 'WELCOME100' && subtotal >= 500 ? 100 : 0;
  const shipping = subtotal === 0 ? 0 : subtotal - discount >= 1000 ? 0 : 60;
  const total = Math.max(subtotal - discount, 0) + shipping;

  if (authed === false) {
    router.push('/login?next=/checkout');
    return <p className="text-sm text-ink-700/60">請先登入，跳轉中…</p>;
  }
  if (authed === null) return <p className="text-sm text-ink-700/60">載入中…</p>;

  async function submit(fd: FormData) {
    setBusy(true);
    setErr('');
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Demo 模式：尚未設定 Supabase 連線，可先體驗選門市＋購物車流程，送單需接上 Supabase。');
      if (method === 'cvs' && !cvs) throw new Error('請先選擇取貨門市');
      const sb = createClient();
      const { data: u } = await sb.auth.getUser();
      if (!u.user) throw new Error('尚未登入');
      const { data: cart } = await sb.from('cart_items').select('sku_id,qty');
      let items = cart ?? [];
      if (!items.length) {
        try {
          items = JSON.parse(localStorage.getItem('solo-ec-cart') ?? '[]');
        } catch {
          items = [];
        }
      }
      if (!items.length) throw new Error('購物車是空的');
      const phone = String(fd.get('phone') ?? '').replace(/\D/g, '');
      if (!/^09\d{8}$/.test(phone)) throw new Error('手機請填 09 開頭共 10 碼');
      const { data: orderId, error } = await sb.rpc('place_order', {
        p_user_id: u.user.id,
        p_items: items,
        p_shipping_method: method,
        p_recipient_name: String(fd.get('name') ?? ''),
        p_recipient_phone: phone,
        p_recipient_address:
          method === 'home' ? String(fd.get('address') ?? '') : `${cvs?.store_name} ${cvs?.store_address}`,
        p_coupon_code: String(fd.get('coupon') ?? '').trim().toUpperCase() || null,
      });
      if (error) throw new Error(error.message.includes('fetch') ? '尚未設定 Supabase 連線（demo 模式不送單）' : error.message);
      try { localStorage.setItem('solo-ec-last-order', String(orderId)); } catch {}
      if (method === 'cvs' && cvs) {
        localStorage.setItem(`solo-ec-order-${orderId}`, JSON.stringify(cvs));
      }
      // 取綠界付款表單：需帶登入 token（Edge Function 有開 verify_jwt，直接跳轉帶不了 header）
      const { data: sess } = await sb.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ecpay-create?order_id=${orderId}`,
        { headers: { Authorization: `Bearer ${sess.session?.access_token ?? ''}` } }
      );
      if (!res.ok) throw new Error(`取付款單失敗（${res.status}），訂單已成立，可到會員中心重試付款或聯繫客服`);
      const html = await res.text();
      document.open();
      document.write(html);
      document.close();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[1fr_320px]">
      {filteredNote && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 md:col-span-2">{filteredNote}</p>
      )}
      <form action={submit} className="space-y-3 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-soft">
        <h1 className="font-serif text-2xl font-bold tracking-tight">結帳</h1>
        <input name="name" placeholder="收件人" className="w-full rounded-xl border border-ink-900/15 p-2.5 text-sm" required maxLength={30} />
        <input
          name="phone" placeholder="手機（09 開頭 10 碼）" inputMode="numeric"
          pattern="09[0-9]{8}" title="請填 09 開頭共 10 碼"
          className="w-full rounded-xl border border-ink-900/15 p-2.5 text-sm" required
        />
        <div className="flex gap-2">
          <label className={`flex-1 cursor-pointer rounded-xl border p-2.5 text-center text-sm transition ${method === 'home' ? 'border-ink-950 bg-cream-100 font-bold' : 'border-ink-900/15'}`}>
            <input type="radio" className="mr-1 accent-black" checked={method === 'home'} onChange={() => setMethod('home')} /> 宅配
          </label>
          <label className={`flex-1 cursor-pointer rounded-xl border p-2.5 text-center text-sm transition ${method === 'cvs' ? 'border-ink-950 bg-cream-100 font-bold' : 'border-ink-900/15'}`}>
            <input type="radio" className="mr-1 accent-black" checked={method === 'cvs'} onChange={() => setMethod('cvs')} /> 超商取貨
          </label>
        </div>
        {method === 'home' ? (
          <input name="address" placeholder="宅配地址（含郵遞區號更佳）" className="w-full rounded-xl border border-ink-900/15 p-2.5 text-sm" required />
        ) : (
          <CvsPicker onPick={setCvs} />
        )}
        <input
          name="coupon" placeholder="優惠碼 (如 WELCOME100，購物車已填會自動帶入)" value={coupon}
          onChange={(e) => { setCoupon(e.target.value); try { localStorage.setItem(COUPON_KEY, e.target.value); } catch {} }}
          className="w-full rounded-xl border border-ink-900/15 p-2.5 text-sm"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={busy || !lines.length} className="w-full rounded-full bg-ink-950 py-2.5 text-sm font-bold text-white transition hover:bg-gold-600 disabled:opacity-50">
          {busy ? '建立訂單中…' : `建立訂單並付款 NT$ ${total}`}
        </button>
        <p className="text-xs text-ink-700/50">隱密包裝出貨，品名標示「生活用品」。貼身用品拆封恕不退換。</p>
      </form>
      <aside className="h-fit rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <h2 className="font-serif font-bold">訂單明細（{lines.length} 件）</h2>
        {!lines.length && <p className="mt-2 text-sm text-ink-700/55">購物車是空的，先去 <a className="font-medium text-gold-600 hover:underline" href="/products">逛逛</a>。</p>}
        <ul className="mt-2 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.sku_id} className="flex justify-between gap-2 border-b border-ink-900/5 pb-2">
              <span>{l.product_name}<br /><span className="text-xs text-ink-700/50">{l.spec_name} × {l.qty}</span></span>
              <span className="whitespace-nowrap font-medium">NT$ {l.price * l.qty}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>小計</span><span>NT$ {subtotal}</span></div>
          <div className="flex justify-between"><span>優惠 {discount > 0 && '(WELCOME100)'}</span><span>−NT$ {discount}</span></div>
          <div className="flex justify-between"><span>運費{shipping === 0 && subtotal > 0 ? '（滿千免運）' : ''}</span><span>NT$ {shipping}</span></div>
          <div className="flex justify-between border-t border-ink-900/10 pt-2 font-serif font-bold"><span>合計</span><span>NT$ {total}</span></div>
        </div>
      </aside>
    </div>
  );
}
