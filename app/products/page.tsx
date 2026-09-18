import { createServerClient } from '@/lib/supabase';
import { mockProducts, mockCategories } from '@/lib/mock';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

export default async function ProductsPage({ searchParams }: { searchParams: { cat?: string; q?: string; sort?: string; page?: string } }) {
  const cat = searchParams.cat ?? 'all';
  const q = (searchParams.q ?? '').trim();
  const sort = searchParams.sort ?? 'new';
  const page = Math.max(0, Number(searchParams.page ?? 0) || 0);
  const buildLink = (over: { cat?: string; sort?: string; page?: number }) => {
    const p = new URLSearchParams();
    const c = over.cat ?? cat;
    const s = over.sort ?? sort;
    if (c !== 'all') p.set('cat', c);
    if (q) p.set('q', q);
    if (s !== 'new') p.set('sort', s);
    if ((over.page ?? page) > 0) p.set('page', String(over.page ?? page));
    const qs = p.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };
  const link = (s: string) => buildLink({ sort: s, page: 0 });
  const catLink = (slug: string) => buildLink({ cat: slug, page: 0 });
  let products = mockProducts;
  let cats = mockCategories;
  let total = mockProducts.length;
  try {
    const supabase = createServerClient();
    const { data: dbCats } = await supabase.from('categories').select('name,slug').eq('is_active', true).order('sort');
    if (dbCats?.length) cats = [{ slug: 'all', name: '全部' }, ...dbCats];
    let query = supabase.from('products').select('name,slug,base_price,description,cover_image,created_at,categories(slug)', { count: 'exact' }).eq('is_active', true);
    if (cat !== 'all') query = query.eq('categories.slug', cat);
    if (q) query = query.ilike('name', `%${q}%`);
    if (sort === 'asc') query = query.order('base_price', { ascending: true });
    else if (sort === 'desc') query = query.order('base_price', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const from = page * PAGE_SIZE;
    const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
    total = count ?? 0;
    if (data?.length) {
      products = data.map((p: any) => ({
        name: p.name, slug: p.slug, category: cat, description: p.description ?? '',
        base_price: p.base_price, cover_image: p.cover_image ?? null, is_featured: false, skus: [],
      }));
    } else if (q || cat !== 'all' || page > 0) {
      products = [];
    }
  } catch {}

  const filtered = (cat === 'all' ? products : products.filter((p) => p.category === cat || !p.category))
    .slice()
    .sort((a, b) => (sort === 'asc' ? a.base_price - b.base_price : sort === 'desc' ? b.base_price - a.base_price : 0));
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold tracking-tight">全部商品 {q ? `・搜尋「${q}」` : ''} <span className="ml-1 align-middle font-sans text-xs font-normal text-ink-700/50">共 {total} 件</span></h1>
        <div className="flex gap-1 text-sm">
          {[['new', '最新'], ['asc', '價格低→高'], ['desc', '價格高→低']].map(([v, t]) => (
            <a key={v} href={link(v)} className={`rounded-full border px-3 py-1 transition ${sort === v ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-900/15 bg-white hover:bg-cream-100'}`}>{t}</a>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <a key={c.slug} href={catLink(c.slug)}
            className={`rounded-full border px-3 py-1 text-sm transition ${cat === c.slug ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-900/15 bg-white hover:bg-cream-100'}`}>
            {c.name}
          </a>
        ))}
      </div>
      {!filtered.length && <p className="text-sm text-ink-700/55">沒有符合商品。試試其他分類或清除搜尋。</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {filtered.map((p) => (
          <a key={p.slug} href={`/products/${p.slug}`} className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5">
            {(p as any).cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(p as any).cover_image} alt={p.name} className="h-28 w-full rounded-xl bg-neutral-50 object-contain" loading="lazy" />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl bg-neutral-100 text-4xl">📦</div>
            )}
            <div className="mt-2 truncate text-sm font-medium">{p.name}</div>
            <div className="mt-1 line-clamp-2 text-xs text-ink-700/55">{p.description}</div>
            <div className="mt-1 font-serif font-bold">NT$ {p.base_price}</div>
          </a>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 text-sm">
          <a href={buildLink({ page: Math.max(0, page - 1) })} aria-disabled={page === 0} className={`rounded-full border px-4 py-1.5 ${page === 0 ? 'pointer-events-none opacity-40' : 'bg-white hover:bg-cream-100'}`}>← 上一頁</a>
          <span className="text-ink-700/55">第 {page + 1} / {pageCount} 頁</span>
          <a href={buildLink({ page: Math.min(pageCount - 1, page + 1) })} aria-disabled={page >= pageCount - 1} className={`rounded-full border px-4 py-1.5 ${page >= pageCount - 1 ? 'pointer-events-none opacity-40' : 'bg-white hover:bg-cream-100'}`}>下一頁 →</a>
        </div>
      )}
    </div>
  );
}
