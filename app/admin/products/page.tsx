'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';


export default function AdminProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', slug: '', base_price: 990, is_featured: false, description: '' });
  const [skuForm, setSkuForm] = useState<Record<string, { spec: string; price: string; stock: string }>>({});
  const [msg, setMsg] = useState('');

  async function load() {
    const sb = createClient();
    const { data } = await sb.from('products').select('id,name,slug,is_active,is_featured,base_price,product_skus(id,sku_code,spec_name,price,stock)').order('created_at', { ascending: false }).limit(200);
    if (data) setRows(data);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg('');
    const sb = createClient();
    if (!form.name || !form.slug) { setMsg('請填商品名與 slug'); return; }
    const { data, error } = await sb.from('products').insert({
      name: form.name, slug: form.slug, base_price: Number(form.base_price),
      description: form.description, is_featured: form.is_featured, is_active: true,
    }).select('id').single();
    if (error) { setMsg(`新增失敗：${error.message}`); return; }
    await sb.from('product_skus').insert({ product_id: data.id, sku_code: `${form.slug.toUpperCase()}-STD`, spec_name: '標準', price: Number(form.base_price), stock: 50 });
    setMsg('已新增（含一組標準 SKU），請再到 Table Editor 補圖與分類');
    setForm({ name: '', slug: '', base_price: 990, is_featured: false, description: '' });
    load();
  }

  async function toggle(p: any, field: 'is_active' | 'is_featured') {
    const sb = createClient();
    await sb.from('products').update({ [field]: !p[field] }).eq('id', p.id);
    load();
  }

  async function saveSku(productId: string, skuId?: string) {
    const f = skuForm[productId] ?? { spec: '', price: '', stock: '' };
    const sb = createClient();
    if (!f.spec || !f.price) { setMsg('SKU 需填規格與價格'); return; }
    if (skuId) {
      await sb.from('product_skus').update({ spec_name: f.spec, price: Number(f.price), stock: Number(f.stock || 0) }).eq('id', skuId);
    } else {
      await sb.from('product_skus').insert({ product_id: productId, sku_code: `SKU-${Date.now().toString(36).toUpperCase()}`, spec_name: f.spec, price: Number(f.price), stock: Number(f.stock || 0) });
    }
    setMsg('SKU 已儲存（超賣防護靠下單 RPC 鎖庫存，勿手動把庫存設負數）');
    load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded bg-white p-4">
        <h1 className="font-bold">新增商品</h1>
        <div className="mt-2 grid gap-2 md:grid-cols-5">
          <input className="rounded border p-2" placeholder="商品名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded border p-2" placeholder="slug (英文-唯一)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="rounded border p-2" type="number" placeholder="售價" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} />
          <input className="rounded border p-2 md:col-span-2" placeholder="簡短描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <label><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> 首頁精選</label>
          <button onClick={create} className="rounded bg-black px-4 py-2 text-white">新增</button>
          {msg && <span>{msg}</span>}
        </div>
      </div>
      {rows.map((p) => (
        <div key={p.id} className="rounded bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <b>{p.name}</b><span className="text-xs text-neutral-500">{p.slug}｜NT$ {p.base_price}</span>
            <button onClick={() => toggle(p, 'is_active')} className="rounded border px-2 py-0.5 text-xs">{p.is_active ? '下架' : '上架'}</button>
            <button onClick={() => toggle(p, 'is_featured')} className="rounded border px-2 py-0.5 text-xs">{p.is_featured ? '取消精選' : '設精選'}</button>
          </div>
          <div className="mt-2 text-sm space-y-1">
            {(p.product_skus ?? []).map((s: any) => (
              <div key={s.id} className="flex gap-2"> <span>{s.sku_code}｜{s.spec_name}｜NT$ {s.price}｜庫存 {s.stock}</span></div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <input className="rounded border p-1 text-sm" placeholder="新規格 (如 粉/標準)" value={skuForm[p.id]?.spec ?? ''} onChange={(e) => setSkuForm({ ...skuForm, [p.id]: { spec: e.target.value, price: skuForm[p.id]?.price ?? '', stock: skuForm[p.id]?.stock ?? '' } })} />
            <input className="rounded border p-1 text-sm" placeholder="價格" value={skuForm[p.id]?.price ?? ''} onChange={(e) => setSkuForm({ ...skuForm, [p.id]: { spec: skuForm[p.id]?.spec ?? '', price: e.target.value, stock: skuForm[p.id]?.stock ?? '' } })} />
            <input className="rounded border p-1 text-sm" placeholder="庫存" value={skuForm[p.id]?.stock ?? ''} onChange={(e) => setSkuForm({ ...skuForm, [p.id]: { spec: skuForm[p.id]?.spec ?? '', price: skuForm[p.id]?.price ?? '', stock: e.target.value } })} />
            <button onClick={() => saveSku(p.id)} className="rounded border px-3 py-1 text-sm">＋ 新增 SKU</button>
          </div>
        </div>
      ))}
    </div>
  );
}
