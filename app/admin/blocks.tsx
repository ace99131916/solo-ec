'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

function Block({ title, table, fields, hint }: { title: string; table: string; fields: { key: string; label: string }[]; hint?: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [sortDraft, setSortDraft] = useState<Record<string, string>>({});
  async function load() {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setMsg('尚未設定 Supabase 連線（先照 DEPLOY.md 設定環境變數）'); return; }
      const sb = createClient();
      // 有 sort 欄的表照排序顯示（跟前台一致），沒有的照建立時間
      let { data, error }: { data: any[] | null; error: any } =
        await sb.from(table).select('*').order('sort', { ascending: true }).limit(100);
      if (error && /sort|column/i.test(error.message)) {
        const r2 = await sb.from(table).select('*').order('created_at', { ascending: false }).limit(100);
        data = r2.data;
        error = r2.error;
      }
      if (error) { setMsg(`載入失敗：${error.message}`); return; }
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
  async function saveSort(r: any) {
    const v = sortDraft[r.id];
    if (v === undefined || v === '') return;
    const { error } = await createClient().from(table).update({ sort: Number(v) || 0 }).eq('id', r.id);
    setMsg(error ? `失敗：${error.message}` : `「${r.name ?? r.title ?? r.code}」排序已改為 ${Number(v) || 0}，前台即時生效。`);
    if (!error) {
      setSortDraft((d) => {
        const n = { ...d };
        delete n[r.id];
        return n;
      });
      load();
    }
  }
  async function del(id: string) {
    if (!confirm('確定刪除？')) return;
    await createClient().from(table).delete().eq('id', id);
    load();
  }
  return (
    <div className="rounded bg-white p-4">
      <h2 className="font-bold">{title}</h2>
      {hint && <p className="mt-1 text-sm leading-6 text-neutral-500">{hint}</p>}
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        {fields.map((f) => (
          <input key={f.key} className="rounded border p-2 text-sm" placeholder={f.label} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        ))}
      </div>
      <button onClick={add} className="mt-2 rounded bg-black px-4 py-1 text-sm text-white">新增</button>
      {msg && <span className="ml-2 text-sm">{msg}</span>}
      <ul className="mt-3 space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t py-1.5">
            <span>{r.name ?? r.title ?? r.code} <span className="text-neutral-400">({r.slug ?? r.code ?? ''}){r.sort !== undefined ? `・排序 ${r.sort}` : ''} {r.is_active === false ? '・已停用' : ''}</span></span>
            <span className="flex items-center gap-1">
              {r.sort !== undefined && (
                <span className="mr-1 flex items-center gap-1">
                  <input
                    type="number"
                    title="排序（數字小排前面，改完按儲存）"
                    placeholder="排序"
                    value={sortDraft[r.id] ?? ''}
                    onChange={(e) => setSortDraft({ ...sortDraft, [r.id]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveSort(r); }}
                    className="w-16 rounded border px-1.5 py-0.5 text-xs"
                  />
                  <button onClick={() => saveSort(r)} disabled={sortDraft[r.id] === undefined || sortDraft[r.id] === ''} className="rounded border px-2 text-xs disabled:opacity-40">儲存</button>
                </span>
              )}
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
  return <Block title="分類管理" table="categories" hint="排序數字小排前面（可填 10、20、30…方便以後插隊）。改右邊排序欄按儲存即時生效，影響首頁分類和商品頁篩選的順序。上方導覽列的順序是另一套寫死的，要調跟我說。" fields={[{ key: 'name', label: '名稱' }, { key: 'slug', label: 'slug(英文唯一)' }, { key: 'sort', label: '排序數字' }]} />;
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
