'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { readLocalCart, setQtyLocal, clearLocal } from '@/lib/cart';
import { mockProducts } from '@/lib/mock';

type Line = {
  sku_id: string;
  qty: number;
  spec_name: string;
  price: number;
  product_name: string;
  stock: number;
};

const skuMap = new Map(
  mockProducts.flatMap((p) =>
    p.skus.map((s) => [s.id, { ...s, product_name: p.name, slug: p.slug }])
  )
);

export default function CartPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [coupon, setCoupon] = useState('WELCOME100');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.auth.getUser();
        setUserId(data.user?.id ?? null);
        if (data.user) {
          // 登入：讀雲端購物車
          const { data: rows } = await sb
            .from('cart_items')
            .select('sku_id,qty,product_skus(spec_name,price,stock,products(name))');
          const mapped: Line[] =
            rows?.map((r: any) => ({
              sku_id: r.sku_id,
              qty: r.qty,
              spec_name: r.product_skus?.spec_name ?? skuMap.get(r.sku_id)?.spec_name ?? r.sku_id,
              price: r.product_skus?.price ?? skuMap.get(r.sku_id)?.price ?? 0,
              product_name: r.product_skus?.products?.name ?? skuMap.get(r.sku_id)?.product_name ?? '商品',
              stock: r.product_skus?.stock ?? 99,
            })) ?? [];
          if (mapped.length) setLines(mapped);
          else hydrateLocal();
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
          };
        })
      );
      // 訪客 localStorage 可能是真實 DB UUID（mock 表查不到），再向 DB 補查一次
      const unknownIds = local.filter((l) => !skuMap.get(l.sku_id)).map((l) => l.sku_id);
      if (unknownIds.length) {
        (async () => {
          try {
            const sb = createClient();
            const { data } = await sb
              .from('product_skus')
              .select('id,spec_name,price,stock,products(name)')
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
                    };
                  }
                  return {
                    sku_id: l.sku_id, qty: l.qty,
                    spec_name: hit.spec_name, price: hit.price,
                    product_name: hit.products?.name ?? '商品', stock: hit.stock,
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
    if (!userId) {
      setQtyLocal(sku_id, qty);
      return;
    }
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
      <h1 className="text-xl font-bold">購物車</h1>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        {lines.length === 0 && <p className="text-neutral-500">購物車是空的，去 <a className="text-blue-600" href="/products">逛逛</a>。</p>}
        {lines.map((l) => (
          <div key={l.sku_id} className="border-b py-3 last:border-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{l.product_name}</div>
                <div className="text-sm text-neutral-500">{l.spec_name}｜NT$ {l.price}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded border px-2" onClick={() => changeQty(l.sku_id, l.qty - 1)}>−</button>
                <span className="w-6 text-center">{l.qty}</span>
                <button
                  className="rounded border px-2 disabled:opacity-30" disabled={l.qty >= Math.min(l.stock, 99)}
                  title={l.qty >= l.stock ? `庫存僅剩 ${l.stock}` : '增加數量'}
                  onClick={() => changeQty(l.sku_id, Math.min(l.qty + 1, l.stock, 99))}>＋</button>
                <button className="ml-2 text-sm text-red-600" onClick={() => { if (confirm(`移除「${l.product_name}」？`)) changeQty(l.sku_id, 0); }}>移除</button>
              </div>
            </div>
            {l.qty >= l.stock && l.stock > 0 && <div className="mt-1 text-right text-xs text-orange-600">已達庫存上限（{l.stock}）</div>}
          </div>
        ))}
      </div>
      {lines.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="優惠碼" className="w-full rounded border p-2" />
            <button className="rounded border px-3" onClick={() => setCoupon('')}>清除</button>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>小計</span><span>NT$ {subtotal}</span></div>
            <div className="flex justify-between"><span>優惠</span><span>−NT$ {discount}</span></div>
            <div className="flex justify-between"><span>運費{shipping === 0 ? '（滿千免運）' : ''}</span><span>NT$ {shipping}</span></div>
            <div className="flex justify-between font-bold"><span>合計</span><span>NT$ {total}</span></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={clear} className="rounded border px-4 py-2">清空</button>
            <a href="/checkout" className="flex-1 rounded bg-black py-2 text-center text-white">前往結帳</a>
          </div>
          {!userId && <p className="mt-2 text-xs text-neutral-500">訪客結帳可先預覽，正式送單需 <a className="text-blue-600" href="/login">登入</a>（登入後購物車自動合併）。</p>}
        </div>
      )}
    </div>
  );
}
