'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

// 商品管理列表：新增一次填完（圖片/規格/庫存/介紹），列表圖片/條列切換，點圖或點名進編輯頁
// 搜尋＋分類＋分頁全部打後端查詢，商品再多也找得到
// 列表狀態（搜尋/分類/頁碼/筆數/檢視）同步到網址，從編輯頁回來會停在同一頁
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

export const dynamic = 'force-dynamic';

function ProductList() {
  const router = useRouter();
  const sp = useSearchParams();
  const initPer = Number(sp.get('per') ?? 48);
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState(sp.get('q') ?? '');
  const [catFilter, setCatFilter] = useState(sp.get('cat') ?? '');
  const [page, setPage] = useState(Math.max(0, (Number(sp.get('page') ?? 1) || 1) - 1));
  const [perPage, setPerPage] = useState(PAGE_SIZE_OPTIONS.includes(initPer) ? initPer : 48);
  const [jump, setJump] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>(sp.get('view') === 'list' ? 'list' : 'grid');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', base_price: 990, is_featured: false, description: '', category_id: '', spec: '標準', stock: '50', detail: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  async function loadCats() {
    const sb = createClient();
    const { data: catData } = await sb.from('categories').select('id,name,slug').order('sort').limit(100);
    if (catData) setCats(catData);
  }

  async function loadList(q: string, cat: string, pg: number, per: number) {
    setLoading(true);
    try {
      const sb = createClient();
      let query = sb.from('products').select('id,name,slug,is_active,is_featured,base_price,category_id,cover_image,product_skus(stock,is_active)', { count: 'exact' });
      const keyword = q.trim().replace(/[,()%]/g, '');
      if (keyword) query = query.or(`name.ilike.%${keyword}%,slug.ilike.%${keyword}%`);
      if (cat) query = query.eq('category_id', cat);
      const from = pg * per;
      const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + per - 1);
      if (error) { setMsg(`商品列表載入失敗：${error.message}`); return; }
      setRows(data ?? []);
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  }

  // 首次載入分類；搜尋/分類/頁碼/筆數變動時打後端（搜尋框防抖 400ms）
  useEffect(() => { loadCats(); }, []);
  useEffect(() => {
    const t = setTimeout(() => loadList(search, catFilter, page, perPage), 400);
    return () => clearTimeout(t);
  }, [search, catFilter, page, perPage]);

  // 列表狀態同步到網址：從編輯頁回來時停在同一頁/同一組篩選
  useEffect(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set('q', search.trim());
    if (catFilter) p.set('cat', catFilter);
    if (page > 0) p.set('page', String(page + 1));
    if (perPage !== 48) p.set('per', String(perPage));
    if (view !== 'grid') p.set('view', view);
    const qs = p.toString();
    router.replace(`/admin/products${qs ? `?${qs}` : ''}`, { scroll: false });
    try { sessionStorage.setItem('admin-products-return', `/admin/products${qs ? `?${qs}` : ''}`); } catch {}
  }, [search, catFilter, page, perPage, view, router]);

  // 從編輯頁返回時重抓（保證改名/改價即時可見，頁碼篩選不動）
  useEffect(() => {
    const onFocus = () => loadList(search, catFilter, page, perPage);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  });

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '未分類';
  const stockOf = (p: any) => (p.product_skus ?? []).reduce((s: number, x: any) => s + (x.stock ?? 0), 0);
  const pageCount = Math.max(1, Math.ceil(total / perPage));

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
        const path = `${form.slug.trim()}/${Date.now()}-${safe}`;
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
      setSearch('');
      setCatFilter('');
      setPage(0);
      loadList('', '', 0, perPage);
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
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="搜尋商品名 / slug（後端查詢）…" className="w-56 rounded-full border bg-white px-4 py-1.5 text-sm" />
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(0); }} className="rounded-full border bg-white px-3 py-1.5 text-sm">
          <option value="">全部分類</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="ml-auto flex overflow-hidden rounded-full border bg-white text-sm">
          <button onClick={() => setView('grid')} className={`px-4 py-1.5 ${view === 'grid' ? 'bg-black text-white' : ''}`}>圖片</button>
          <button onClick={() => setView('list')} className={`px-4 py-1.5 ${view === 'list' ? 'bg-black text-white' : ''}`}>條列</button>
        </span>
        <span className="text-xs text-neutral-400">{loading ? '查詢中…' : `第 ${page + 1} / ${pageCount} 頁・共 ${total} 件`}</span>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {rows.map((p) => (
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
          {rows.map((p) => (
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
          {!rows.length && !loading && <div className="p-6 text-center text-sm text-neutral-400">找不到商品，換個關鍵字或分類。</div>}
        </div>
      )}
      {view === 'grid' && !rows.length && !loading && <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-400">找不到商品，換個關鍵字或分類。</div>}

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <button onClick={() => setPage((v) => Math.max(0, v - 1))} disabled={page === 0 || loading} className="rounded-full border bg-white px-4 py-1.5 disabled:opacity-40">← 上一頁</button>
        <span className="text-neutral-500">第 {page + 1} / {pageCount} 頁</span>
        <button onClick={() => setPage((v) => Math.min(pageCount - 1, v + 1))} disabled={page >= pageCount - 1 || loading} className="rounded-full border bg-white px-4 py-1.5 disabled:opacity-40">下一頁 →</button>
        <span className="flex items-center gap-1 text-neutral-500">
          每頁
          {PAGE_SIZE_OPTIONS.map((n) => (
            <button key={n} onClick={() => { setPerPage(n); setPage(0); }} className={`rounded-full border px-2.5 py-1 text-xs ${perPage === n ? 'bg-black text-white' : 'bg-white'}`}>{n}</button>
          ))}
        </span>
        <span className="flex items-center gap-1 text-neutral-500">
          跳到第
          <input value={jump} onChange={(e) => setJump(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const n = Math.min(pageCount, Math.max(1, Number(jump) || 1)); setPage(n - 1); setJump(''); } }} type="number" min={1} max={pageCount} placeholder={String(page + 1)} className="w-14 rounded-full border bg-white px-2 py-1 text-center text-sm" />
          頁
          <button onClick={() => { const n = Math.min(pageCount, Math.max(1, Number(jump) || 1)); setPage(n - 1); setJump(''); }} className="rounded-full border bg-white px-3 py-1">前往</button>
        </span>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">載入商品管理中…</p>}>
      <ProductList />
    </Suspense>
  );
}
