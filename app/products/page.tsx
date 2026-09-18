import { createServerClient } from '@/lib/supabase';
import { mockProducts, mockCategories } from '@/lib/mock';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

export default async function ProductsPage({ searchParams }: { searchParams: { cat?: string; q?: string; sort?: string; page?: string; per?: string } }) {
  const cat = searchParams.cat ?? 'all';
  const q = (searchParams.q ?? '').trim();
  const sort = searchParams.sort ?? 'new';
  const per = PAGE_SIZE_OPTIONS.includes(Number(searchParams.per)) ? Number(searchParams.per) : PAGE_SIZE_DEFAULT;
  const page1 = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const buildLink = (over: { cat?: string; sort?: string; page?: number; per?: number }) => {
    const p = new URLSearchParams();
    const c = over.cat ?? cat;
    const s = over.sort ?? sort;
    const pg = over.page ?? page1;
    const perV = over.per ?? per;
    if (c !== 'all') p.set('cat', c);
    if (q) p.set('q', q);
    if (s !== 'new') p.set('sort', s);
    if (perV !== PAGE_SIZE_DEFAULT) p.set('per', String(perV));
    if (pg > 1) p.set('page', String(pg));
    const qs = p.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };
  const link = (s: string) => buildLink({ sort: s, page: 1 });
  const catLink = (slug: string) => buildLink({ cat: slug, page: 1 });
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
    const from = (page1 - 1) * per;
    const { data, count } = await query.range(from, from + per - 1);
    total = count ?? 0;
    if (data?.length) {
      products = data.map((p: any) => ({
        name: p.name, slug: p.slug, category: cat, description: p.description ?? '',
        base_price: p.base_price, cover_image: p.cover_image ?? null, is_featured: false, skus: [],
      }));
    } else if (q || cat !== 'all' || page1 > 1) {
      products = [];
    }
  } catch {}

  const pageCount = Math.max(1, Math.ceil(total / per));
  if (page1 > pageCount) redirect(buildLink({ page: pageCount }));

  const filtered = (cat === 'all' ? products : products.filter((p) => p.category === cat || !p.category))
    .slice()
    .sort((a, b) => (sort === 'asc' ? a.base_price - b.base_price : sort === 'desc' ? b.base_price - a.base_price : 0));
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
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-sm">
          <a href={buildLink({ page: Math.max(1, page1 - 1) })} aria-disabled={page1 === 1} className={`rounded-full border px-4 py-1.5 ${page1 === 1 ? 'pointer-events-none opacity-40' : 'bg-white hover:bg-cream-100'}`}>← 上一頁</a>
          <span className="text-ink-700/55">第 {page1} / {pageCount} 頁</span>
          <a href={buildLink({ page: Math.min(pageCount, page1 + 1) })} aria-disabled={page1 >= pageCount} className={`rounded-full border px-4 py-1.5 ${page1 >= pageCount ? 'pointer-events-none opacity-40' : 'bg-white hover:bg-cream-100'}`}>下一頁 →</a>
          <span className="flex items-center gap-1.5 text-ink-700/55">
            每頁
            {PAGE_SIZE_OPTIONS.map((n) => (
              <a key={n} href={buildLink({ per: n, page: 1 })} className={`rounded-full border px-2.5 py-1 text-xs ${per === n ? 'border-ink-950 bg-ink-950 text-white' : 'bg-white hover:bg-cream-100'}`}>{n}</a>
            ))}
          </span>
          <form action="/products" className="flex items-center gap-1.5 text-ink-700/55">
            {cat !== 'all' && <input type="hidden" name="cat" value={cat} />}
            {q && <input type="hidden" name="q" value={q} />}
            {sort !== 'new' && <input type="hidden" name="sort" value={sort} />}
            {per !== PAGE_SIZE_DEFAULT && <input type="hidden" name="per" value={per} />}
            跳到第
            <input name="page" type="number" min={1} max={pageCount} defaultValue={page1} className="w-16 rounded-full border border-ink-900/15 bg-white px-2 py-1 text-center text-sm" />
            頁
            <button type="submit" className="rounded-full border border-ink-900/15 bg-white px-3 py-1 hover:bg-cream-100">前往</button>
          </form>
        </div>
      )}
    </div>
  );
}
