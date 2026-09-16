import { createServerClient } from '@/lib/supabase';
import { mockProducts, mockCategories } from '@/lib/mock';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams: { cat?: string; q?: string; sort?: string } }) {
  const cat = searchParams.cat ?? 'all';
  const q = (searchParams.q ?? '').trim();
  const sort = searchParams.sort ?? 'new';
  const link = (s: string) => {
    const p = new URLSearchParams();
    if (cat !== 'all') p.set('cat', cat);
    if (q) p.set('q', q);
    if (s !== 'new') p.set('sort', s);
    const qs = p.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };
  const catLink = (slug: string) => {
    const p = new URLSearchParams();
    if (slug !== 'all') p.set('cat', slug);
    if (q) p.set('q', q);
    if (sort !== 'new') p.set('sort', sort);
    const qs = p.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };
  let products = mockProducts;
  let cats = mockCategories;
  try {
    const supabase = createServerClient();
    const { data: dbCats } = await supabase.from('categories').select('name,slug').eq('is_active', true).order('sort');
    if (dbCats?.length) cats = [{ slug: 'all', name: '全部' }, ...dbCats];
    let query = supabase.from('products').select('name,slug,base_price,description,cover_image,created_at,categories!inner(slug)').eq('is_active', true);
    if (cat !== 'all') query = query.eq('categories.slug', cat);
    if (q) query = query.ilike('name', `%${q}%`);
    if (sort === 'asc') query = query.order('base_price', { ascending: true });
    else if (sort === 'desc') query = query.order('base_price', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data } = await query.limit(60);
    if (data?.length) {
      products = data.map((p: any) => ({
        name: p.name, slug: p.slug, category: cat, description: p.description ?? '',
        base_price: p.base_price, is_featured: false, skus: [],
      }));
    } else if (q || cat !== 'all') {
      products = [];
    }
  } catch {}

  const filtered = (cat === 'all' ? products : products.filter((p) => p.category === cat || !p.category))
    .slice()
    .sort((a, b) => (sort === 'asc' ? a.base_price - b.base_price : sort === 'desc' ? b.base_price - a.base_price : 0));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">全部商品 {q ? `・搜尋「${q}」` : ''}</h1>
        <div className="flex gap-1 text-sm">
          {[['new', '最新'], ['asc', '價格低→高'], ['desc', '價格高→低']].map(([v, t]) => (
            <a key={v} href={link(v)} className={`rounded-full border px-3 py-1 ${sort === v ? 'bg-black text-white' : 'bg-white'}`}>{t}</a>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <a key={c.slug} href={catLink(c.slug)}
            className={`rounded-full border px-3 py-1 text-sm ${cat === c.slug ? 'bg-black text-white' : 'bg-white'}`}>
            {c.name}
          </a>
        ))}
      </div>
      {!filtered.length && <p className="text-sm text-neutral-500">沒有符合商品（照片欄位先留空，上架後會顯示）。試試其他分類或清除搜尋。</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {filtered.map((p) => (
          <a key={p.slug} href={`/products/${p.slug}`} className="rounded-xl bg-white p-4 shadow-sm hover:shadow">
            <div className="flex h-28 items-center justify-center rounded-lg bg-neutral-100 text-4xl">📦</div>
            <div className="mt-2 text-sm font-medium">{p.name}</div>
            <div className="mt-1 line-clamp-2 text-xs text-neutral-500">{p.description}</div>
            <div className="mt-1 font-bold text-red-600">NT$ {p.base_price}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
