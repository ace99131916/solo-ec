'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

// 商品管理列表：新增一次填完（圖片/規格/庫存/介紹），列表圖片/條列切換，點圖或點名進編輯頁
export default function AdminProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', base_price: 990, is_featured: false, description: '', category_id: '', spec: '標準', stock: '50', detail: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  async function load() {
    const sb = createClient();
    const { data, error } = await sb.from('products').select('id,name,slug,is_active,is_featured,base_price,category_id,cover_image,product_skus(stock,is_active)').order('created_at', { ascending: false }).limit(500);
    if (error) { setMsg(`商品列表載入失敗：${error.message}`); return; }
    if (data) setRows(data);
    const { data: catData } = await sb.from('categories').select('id,name,slug').order('sort').limit(100);
    if (catData) setCats(catData);
  }
  useEffect(() => { load(); }, []);

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '未分類';
  const stockOf = (p: any) => (p.product_skus ?? []).reduce((s: number, x: any) => s + (x.stock ?? 0), 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (catFilter && (p.category_id ?? '') !== catFilter) return false;
      if (q && !`${p.name} ${p.slug}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, catFilter]);

  function pickCover(f: File | undefined) {
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function create() {
    if (!form.name.trim() || !form.slug.trim()) { setMsg('請填商品名與 slug'); return; }
    setCreating(true);
    setMsg('新增中…');
    try {
      const sb = createClient();
      const { data, error } = await sb.from('products').insert({
        name: form.name.trim(), slug: form.slug.trim(), base_price: Number(form.base_price) || 0,
        description: form.description, detail_text: form.detail,
        is_featured: form.is_featured, is_active: true,
        category_id: form.category_id || null,
      }).select('id').single();
      if (error) { setMsg(`新增失敗：${error.message}`); return; }
      if (coverFile) {
        const safe = coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${data.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await sb.storage.from('product-images').upload(path, coverFile, { upsert: false });
        if (upErr) { setMsg(`商品已建但首圖上傳失敗：${upErr.message}（可到編輯頁補傳）`); }
        else {
          const { data: pub } = sb.storage.from('product-images').getPublicUrl(path);
          await sb.from('products').update({ cover_image: pub.publicUrl }).eq('id', data.id);
        }
      }
      await sb.from('product_skus').insert({
        product_id: data.id,
        sku_code: `${form.slug.trim().toUpperCase()}-STD`,
        spec_name: form.spec.trim() || '標準',
        price: Number(form.base_price) || 0,
        stock: Number(form.stock || 0),
      });
      setMsg(`已新增「${form.name.trim()}」，可點進編輯頁補多圖。`);
      setForm({ name: '', slug: '', base_price: 990, is_featured: false, description: '', category_id: '', spec: '標準', stock: '50', detail: '' });
      setCoverFile(null);
      setCoverPreview('');
      load();
    } catch (e: any) {
      setMsg(`新增失敗：${e.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <h1 className="font-bold">新增商品 <span className="ml-1 text-xs font-normal text-neutral-400">一次填完：圖片・規格・庫存・介紹</span></h1>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="rounded-xl border p-2 text-sm" placeholder="商品名 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-xl border p-2 text-sm" placeholder="slug（英文-唯一）*" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="rounded-xl border p-2 text-sm" type="number" placeholder="售價" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="rounded-xl border bg-white p-2 text-sm">
            <option value="">分類（未分類）</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <input className="rounded-xl border p-2 text-sm" placeholder="簡短描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="rounded-xl border p-2 text-sm" placeholder="規格（如 粉/標準）" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
          <input className="rounded-xl border p-2 text-sm" type="number" placeholder="庫存" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-sm text-neutral-600 hover:bg-neutral-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="首圖預覽" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg">📦</span>
              )}
            </span>
            <span>{coverFile ? coverFile.name : '上傳首圖'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { pickCover(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
        <textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={2} placeholder="商品介紹（前台主圖下方圖文區，可留空稍後補）" className="mt-2 w-full rounded-xl border p-2 text-sm" />
        <div className="mt-2 flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4 accent-black" /> 首頁精選</label>
          <button onClick={create} disabled={creating} className="rounded-full bg-black px-5 py-2 text-white disabled:opacity-50">{creating ? '新增中…' : '新增'}</button>
          {msg && <span className="text-neutral-500">{msg}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋商品名 / slug…" className="w-56 rounded-full border bg-white px-4 py-1.5 text-sm" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-full border bg-white px-3 py-1.5 text-sm">
          <option value="">全部分類</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="ml-auto flex overflow-hidden rounded-full border bg-white text-sm">
          <button onClick={() => setView('grid')} className={`px-4 py-1.5 ${view === 'grid' ? 'bg-black text-white' : ''}`}>圖片</button>
          <button onClick={() => setView('list')} className={`px-4 py-1.5 ${view === 'list' ? 'bg-black text-white' : ''}`}>條列</button>
        </span>
        <span className="text-xs text-neutral-400">{filtered.length} / {rows.length} 件</span>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {filtered.map((p) => (
            <a key={p.id} href={`/admin/products/${p.id}`} className="group overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-soft transition hover:-translate-y-0.5">
              {p.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image} alt={p.name} className="h-32 w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-neutral-100 text-4xl">📦</div>
              )}
              <div className="p-3">
                <div className="truncate text-sm font-medium group-hover:underline">{p.name}</div>
                <div className="mt-0.5 text-sm font-bold">NT$ {p.base_price}</div>
                <div className="mt-0.5 text-xs text-neutral-400">{catName(p.category_id)}・庫存 {stockOf(p)}{p.is_active === false ? '・已下架' : ''}</div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-soft">
          {filtered.map((p) => (
            <a key={p.id} href={`/admin/products/${p.id}`} className="flex items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0 hover:bg-neutral-50">
              {p.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image} alt={p.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" loading="lazy" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xl">📦</div>
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              <span className="hidden shrink-0 text-xs text-neutral-400 md:block">{catName(p.category_id)}</span>
              <span className="shrink-0 font-bold">NT$ {p.base_price}</span>
              <span className="hidden w-20 shrink-0 text-right text-xs text-neutral-400 sm:block">庫存 {stockOf(p)}</span>
              {p.is_active === false && <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-xs">已下架</span>}
            </a>
          ))}
          {!filtered.length && <div className="p-6 text-center text-sm text-neutral-400">找不到商品，換個關鍵字或分類。</div>}
        </div>
      )}
      {view === 'grid' && !filtered.length && <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-400">找不到商品，換個關鍵字或分類。</div>}
    </div>
  );
}
