'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { readLocalCart, setQtyLocal, clearLocal, mergeLocalToServer } from '@/lib/cart';
import { mockProducts } from '@/lib/mock';

type Line = {
  sku_id: string;
  qty: number;
  spec_name: string;
  price: number;
  product_name: string;
  stock: number;
  cover: string | null;
};

const COUPON_KEY = 'solo-ec-coupon';

const skuMap = new Map(
  mockProducts.flatMap((p) =>
    p.skus.map((s) => [s.id, { ...s, product_name: p.name, slug: p.slug }])
  )
);

export default function CartPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [coupon, setCoupon] = useState(() => {
    try { return localStorage.getItem(COUPON_KEY) ?? 'WELCOME100'; } catch { return 'WELCOME100'; }
  });
  const [userId, setUserId] = useState<string | null>(null);

  function onCoupon(v: string) {
    setCoupon(v);
    try { localStorage.setItem(COUPON_KEY, v); } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.auth.getUser();
        setUserId(data.user?.id ?? null);
        if (data.user) {
          // 登入：先把本機殘留合併上雲再讀，兩邊永遠一致（防刪掉重整又復活）
          try { await mergeLocalToServer(sb, data.user.id); } catch {}
          // 登入：讀雲端購物車（唯一真相，不再回頭讀本機）
          const { data: rows } = await sb
            .from('cart_items')
            .select('sku_id,qty,product_skus(spec_name,price,stock,products(name,cover_image))');
          const mapped: Line[] =
            rows?.map((r: any) => ({
              sku_id: r.sku_id,
              qty: r.qty,
              spec_name: r.product_skus?.spec_name ?? skuMap.get(r.sku_id)?.spec_name ?? r.sku_id,
              price: r.product_skus?.price ?? skuMap.get(r.sku_id)?.price ?? 0,
              product_name: r.product_skus?.products?.name ?? skuMap.get(r.sku_id)?.product_name ?? '商品',
              stock: r.product_skus?.stock ?? 99,
              cover: r.product_skus?.products?.cover_image ?? null,
            })) ?? [];
          setLines(mapped);
        } else hydrateLocal();
      } catch {
        hydrateLocal();
      }
    })();
    function hydrateLocal() {
      const local = readLocalCart();
      setLines(
        local.map((l) => {
          const m = skuMap.get(l.sku_id);
          return {
            sku_id: l.sku_id,
            qty: l.qty,
            spec_name: m?.spec_name ?? l.sku_id,
            price: m?.price ?? 0,
            product_name: m?.product_name ?? '商品',
            stock: m?.stock ?? 99,
            cover: null,
          };
        })
      );
      // 訪客 localStorage 可能是真實 DB UUID（mock 表查不到），再向 DB 補查一次（含首圖）
      const unknownIds = local.filter((l) => !skuMap.get(l.sku_id)).map((l) => l.sku_id);
      if (unknownIds.length) {
        (async () => {
          try {
            const sb = createClient();
            const { data } = await sb
              .from('product_skus')
              .select('id,spec_name,price,stock,products(name,cover_image)')
              .in('id', unknownIds);
            if (data?.length) {
              const m = new Map((data as any[]).map((r: any) => [r.id, r]));
              setLines(
                local.map((l) => {
                  const hit = m.get(l.sku_id) as any;
                  const mock = skuMap.get(l.sku_id);
                  if (!hit) {
                    return {
                      sku_id: l.sku_id, qty: l.qty,
                      spec_name: mock?.spec_name ?? l.sku_id,
                      price: mock?.price ?? 0,
                      product_name: mock?.product_name ?? '商品（已下架？）',
                      stock: mock?.stock ?? 99,
                      cover: null,
                    };
                  }
                  return {
                    sku_id: l.sku_id, qty: l.qty,
                    spec_name: hit.spec_name, price: hit.price,
                    product_name: hit.products?.name ?? '商品', stock: hit.stock,
                    cover: hit.products?.cover_image ?? null,
                  };
                })
              );
            }
          } catch {}
        })();
      }
    }
  }, []);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);
  const discount = coupon.trim().toUpperCase() === 'WELCOME100' && subtotal >= 500 ? 100 : 0;
  const shipping = subtotal === 0 ? 0 : subtotal - discount >= 1000 ? 0 : 60;
  const total = Math.max(subtotal - discount, 0) + shipping;

  async function changeQty(sku_id: string, qty: number) {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.sku_id !== sku_id) : prev.map((l) => (l.sku_id === sku_id ? { ...l, qty } : l))
    );
    setQtyLocal(sku_id, qty); // 本機永遠同步，登入者也一樣（防幽靈商品）
    if (!userId) return;
    try {
      const sb = createClient();
      if (qty <= 0) await sb.from('cart_items').delete().eq('sku_id', sku_id);
      else await sb.from('cart_items').upsert({ user_id: userId, sku_id, qty }, { onConflict: 'user_id,sku_id' });
    } catch {}
  }

  async function clear() {
    setLines([]);
    clearLocal();
    if (userId) {
      try {
        await createClient().from('cart_items').delete().eq('user_id', userId);
      } catch {}
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-bold tracking-tight">購物車</h1>
      <div className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-soft">
        {lines.length === 0 && <p className="text-ink-700/60">購物車是空的，去 <a className="font-medium text-gold-600 hover:underline" href="/products">逛逛</a>。</p>}
        {lines.map((l) => (
          <div key={l.sku_id} className="border-b border-ink-900/5 py-3 last:border-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {l.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.cover} alt={l.product_name} className="h-14 w-14 shrink-0 rounded-xl bg-neutral-50 object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-2xl">📦</div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.product_name}</div>
                  <div className="text-sm text-ink-700/55">{l.spec_name}｜NT$ {l.price}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button className="rounded-full border border-ink-900/15 px-2.5 py-0.5 hover:bg-cream-100" onClick={() => changeQty(l.sku_id, l.qty - 1)}>−</button>
                <span className="w-6 text-center text-sm font-medium">{l.qty}</span>
                <button
                  className="rounded-full border border-ink-900/15 px-2.5 py-0.5 hover:bg-cream-100 disabled:opacity-30" disabled={l.qty >= Math.min(l.stock, 99)}
                  title={l.qty >= l.stock ? `庫存僅剩 ${l.stock}` : '增加數量'}
                  onClick={() => changeQty(l.sku_id, Math.min(l.qty + 1, l.stock, 99))}>＋</button>
                <button className="ml-1 text-sm text-red-600/80 hover:underline" onClick={() => { if (confirm(`移除「${l.product_name}」？`)) changeQty(l.sku_id, 0); }}>移除</button>
              </div>
            </div>
            {l.qty >= l.stock && l.stock > 0 && <div className="mt-1 text-right text-xs text-amber-600">已達庫存上限（{l.stock}）</div>}
          </div>
        ))}
      </div>
      {lines.length > 0 && (
        <div className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-soft">
          <div className="flex gap-2">
            <input value={coupon} onChange={(e) => onCoupon(e.target.value)} placeholder="優惠碼（如 WELCOME100，會自動帶入結帳）" className="w-full rounded-xl border border-ink-900/15 p-2 text-sm" />
            <button className="shrink-0 rounded-full border border-ink-900/15 px-4 text-sm hover:bg-cream-100" onClick={() => onCoupon('')}>清除</button>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>小計</span><span>NT$ {subtotal}</span></div>
            <div className="flex justify-between"><span>優惠</span><span>−NT$ {discount}</span></div>
            <div className="flex justify-between"><span>運費{shipping === 0 ? '（滿千免運）' : ''}</span><span>NT$ {shipping}</span></div>
            <div className="flex justify-between border-t border-ink-900/10 pt-2 font-serif text-base font-bold"><span>合計</span><span>NT$ {total}</span></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={clear} className="rounded-full border border-ink-900/15 px-4 py-2 text-sm hover:bg-cream-100">清空</button>
            <a href="/checkout" className="flex-1 rounded-full bg-ink-950 py-2 text-center text-sm font-bold text-white transition hover:bg-gold-600">前往結帳</a>
          </div>
          {!userId && <p className="mt-2 text-xs text-ink-700/55">訪客結帳可先預覽，正式送單需 <a className="font-medium text-gold-600 hover:underline" href="/login?next=/checkout">登入</a>（登入後購物車自動合併並回到結帳）。</p>}
        </div>
      )}
    </div>
  );
}
