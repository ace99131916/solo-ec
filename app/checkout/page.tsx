'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { readLocalCart } from '@/lib/cart';
import { mockProducts } from '@/lib/mock';
import CvsPicker, { type CvsSelection } from '@/components/CvsPicker';

type Line = { sku_id: string; qty: number; spec_name: string; price: number; product_name: string };

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

  useEffect(() => {
    (async () => {
      try {
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
            setLines(
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
            setLines(
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
          }
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
    router.push('/login');
    return <p className="text-sm">請先登入，跳轉中…</p>;
  }
  if (authed === null) return <p className="text-sm">載入中…</p>;

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
      <form action={submit} className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">結帳</h1>
        <input name="name" placeholder="收件人" className="w-full rounded border p-2" required maxLength={30} />
        <input
          name="phone" placeholder="手機（09 開頭 10 碼）" inputMode="numeric"
          pattern="09[0-9]{8}" title="請填 09 開頭共 10 碼"
          className="w-full rounded border p-2" required
        />
        <div className="flex gap-2">
          <label className={`flex-1 cursor-pointer rounded border p-2 text-center text-sm ${method === 'home' ? 'border-black bg-neutral-50 font-bold' : ''}`}>
            <input type="radio" className="mr-1" checked={method === 'home'} onChange={() => setMethod('home')} /> 宅配
          </label>
          <label className={`flex-1 cursor-pointer rounded border p-2 text-center text-sm ${method === 'cvs' ? 'border-black bg-neutral-50 font-bold' : ''}`}>
            <input type="radio" className="mr-1" checked={method === 'cvs'} onChange={() => setMethod('cvs')} /> 超商取貨
          </label>
        </div>
        {method === 'home' ? (
          <input name="address" placeholder="宅配地址（含郵遞區號更佳）" className="w-full rounded border p-2" required />
        ) : (
          <CvsPicker onPick={setCvs} />
        )}
        <input
          name="coupon" placeholder="優惠碼 (如 WELCOME100)" value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          className="w-full rounded border p-2"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={busy || !lines.length} className="w-full rounded bg-black py-2.5 font-bold text-white disabled:opacity-50">
          {busy ? '建立訂單中…' : `建立訂單並付款 NT$ ${total}`}
        </button>
        <p className="text-xs text-neutral-400">隱密包裝出貨，品名標示「生活用品」。貼身用品拆封恕不退換。</p>
      </form>
      <aside className="h-fit rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-bold">訂單明細（{lines.length} 件）</h2>
        {!lines.length && <p className="mt-2 text-sm text-neutral-500">購物車是空的，先去 <a className="text-blue-600" href="/products">逛逛</a>。</p>}
        <ul className="mt-2 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.sku_id} className="flex justify-between gap-2 border-b pb-2">
              <span>{l.product_name}<br /><span className="text-xs text-neutral-400">{l.spec_name} × {l.qty}</span></span>
              <span className="whitespace-nowrap">NT$ {l.price * l.qty}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>小計</span><span>NT$ {subtotal}</span></div>
          <div className="flex justify-between"><span>優惠 {discount > 0 && '(WELCOME100)'}</span><span>−NT$ {discount}</span></div>
          <div className="flex justify-between"><span>運費{shipping === 0 && subtotal > 0 ? '（滿千免運）' : ''}</span><span>NT$ {shipping}</span></div>
          <div className="flex justify-between border-t pt-2 font-bold"><span>合計</span><span className="text-red-600">NT$ {total}</span></div>
        </div>
      </aside>
    </div>
  );
}
