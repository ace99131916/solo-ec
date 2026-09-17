'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

function Block({ title, table, fields }: { title: string; table: string; fields: { key: string; label: string }[] }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  async function load() {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setMsg('尚未設定 Supabase 連線（先照 DEPLOY.md 設定環境變數）'); return; }
      const { data } = await createClient().from(table).select('*').order('created_at', { ascending: false }).limit(100);
      if (data) setRows(data);
    } catch (e: any) { setMsg(`載入失敗：${e.message}`); }
  }
  useEffect(() => { load(); }, []);
  async function add() {
    const payload: any = {};
    fields.forEach((f) => { if (form[f.key]) payload[f.key] = form[f.key]; });
    if (table === 'coupons' && !payload.code) { setMsg('優惠碼必填'); return; }
    if (table === 'coupons') { payload.discount_type = payload.discount_type || 'fixed'; payload.discount_value = Number(payload.discount_value || 100); }
    if (table === 'categories' && !payload.slug) { setMsg('slug 必填'); return; }
    if (table === 'banners' && !payload.title) { setMsg('標題必填'); return; }
    if (table === 'banners' && !payload.image_url) { payload.image_url = ''; }
    const { error } = await createClient().from(table).insert(payload);
    setMsg(error ? `失敗：${error.message}` : '已新增');
    if (!error) { setForm({}); load(); }
  }
  async function toggleActive(r: any) {
    await createClient().from(table).update({ is_active: !r.is_active }).eq('id', r.id);
    load();
  }
  async function del(id: string) {
    if (!confirm('確定刪除？')) return;
    await createClient().from(table).delete().eq('id', id);
    load();
  }
  return (
    <div className="rounded bg-white p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        {fields.map((f) => (
          <input key={f.key} className="rounded border p-2 text-sm" placeholder={f.label} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        ))}
      </div>
      <button onClick={add} className="mt-2 rounded bg-black px-4 py-1 text-sm text-white">新增</button>
      {msg && <span className="ml-2 text-sm">{msg}</span>}
      <ul className="mt-3 space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between border-t py-1">
            <span>{r.name ?? r.title ?? r.code} <span className="text-neutral-400">({r.slug ?? r.code ?? ''}) {r.is_active === false ? '・已停用' : ''}</span></span>
            <span className="flex gap-1">
              {r.is_active !== undefined && <button onClick={() => toggleActive(r)} className="rounded border px-2 text-xs">{r.is_active ? '停用' : '啟用'}</button>}
              <button onClick={() => del(r.id)} className="rounded border px-2 text-xs text-red-600">刪</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminMiscPage({ params }: { params?: any }) {
  return <div />;
}
export function CategoriesAdmin() {
  return <Block title="分類管理" table="categories" fields={[{ key: 'name', label: '名稱' }, { key: 'slug', label: 'slug(英文唯一)' }, { key: 'sort', label: '排序數字' }]} />;
}
export function CouponsAdmin() {
  return <Block title="優惠券管理" table="coupons" fields={[{ key: 'code', label: '優惠碼 (如 WELCOME100)' }, { key: 'name', label: '名稱' }, { key: 'discount_type', label: 'fixed/percent' }, { key: 'discount_value', label: '折抵金額或折扣' }, { key: 'min_amount', label: '最低金額' }]} />;
}
export function BannersAdmin() {
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-cream-50 p-3 text-sm leading-6 text-ink-700">
        這裡管首頁 Hero 右側<b>自動輪播照片牆</b>（5 秒一張，懸停暫停，可點點點/箭頭切換）。
        <br />・<b>圖片 URL</b>：有圖顯示圖，沒圖顯示質感漸層＋標題。圖片請先上傳 Supabase Storage（banners）後貼 URL，建議 1200×800。
        <br />・<b>連結</b>：點整張圖的目的地。連到指定商品填 <code className="rounded bg-white px-1">/products/商品slug</code>，連到分類填 <code className="rounded bg-white px-1">/products?cat=分類slug</code>。
        <br />・只取<b>上架中前 5 筆</b>，用排序決定播放順序。
      </p>
      <Block title="Banner 管理（Hero 輪播）" table="banners" fields={[{ key: 'title', label: '標題（圖上大字）' }, { key: 'image_url', label: '圖片 URL（建議1200x800，可留空）' }, { key: 'link_url', label: '連結 (/products/商品slug)' }, { key: 'sort', label: '排序（小先播）' }]} />
    </div>
  );
}
