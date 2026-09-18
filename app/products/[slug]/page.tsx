import { createServerClient } from '@/lib/supabase';
import { mockProducts } from '@/lib/mock';
import { notFound } from 'next/navigation';
import AddToCart from '@/components/AddToCart';
import ProductGallery from '@/components/ProductGallery';
import DetailGallery from '@/components/DetailGallery';
import { cardImage } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product: any = mockProducts.find((p) => p.slug === params.slug) ?? null;
  let skus: any[] = product?.skus ?? [];
  let related: any[] = [];
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('products')
      .select('*, product_skus(*), categories(name,slug)')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();
    if (data) {
      product = data;
      skus = (data.product_skus ?? []).filter((s: any) => s.is_active);
      if (data.category_id) {
        const { data: rel } = await supabase
          .from('products')
          .select('name,slug,base_price,cover_image,images')
          .eq('is_active', true)
          .eq('category_id', data.category_id)
          .neq('slug', params.slug)
          .limit(4);
        if (rel) related = rel.map((x: any) => ({ ...x, cover_image: cardImage(x) }));
      }
    }
  } catch {}
  if (!product) return notFound();

  const minPrice = skus.length ? Math.min(...skus.map((s: any) => s.price)) : product.base_price;
  const totalStock = skus.reduce((s: number, x: any) => s + (x.stock ?? 0), 0);
  const soldOut = skus.length > 0 && totalStock === 0;
  const cat = (product as any).categories;

  return (
    <div className="space-y-10">
      <nav className="text-[13px] text-ink-700/50">
        <a href="/" className="hover:text-ink-950">首頁</a> /{' '}
        <a href="/products" className="hover:text-ink-950">全部商品</a>
        {cat && <> / <a href={`/products?cat=${cat.slug}`} className="hover:text-ink-950">{cat.name}</a></>} / {product.name}
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery name={product.name} cover={(product as any).cover_image} images={(product as any).images} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.is_featured && <span className="rounded-full bg-ink-950 px-2.5 py-0.5 text-xs font-bold text-gold-300">熱銷</span>}
            {soldOut
              ? <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs text-neutral-600">補貨中</span>
              : totalStock <= 5 && skus.length > 0
                ? <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">僅剩 {totalStock} 件</span>
                : <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">有現貨</span>}
          </div>
          <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight md:text-3xl">{product.name}</h1>
          <div className="mt-1.5 font-serif text-2xl font-black text-ink-950">
            NT$ {minPrice}
            {skus.length > 1 && <span className="font-sans text-sm font-normal text-ink-700/50"> 起</span>}
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-700/65">{product.description}</p>
          <div className="mt-4 space-y-2">
            {skus.map((sku: any) => (
              <div key={sku.id} className="flex items-center justify-between rounded-xl border border-ink-900/10 bg-white px-4 py-2.5 shadow-soft">
                <span className="text-sm">
                  {sku.spec_name}｜<b className="font-serif">NT$ {sku.price}</b>｜
                  {sku.stock === 0 ? <span className="text-neutral-400">缺貨</span> : sku.stock <= 5 ? <span className="text-amber-600">剩 {sku.stock}</span> : <span className="text-emerald-700">有貨</span>}
                </span>
                <AddToCart sku_id={sku.id} disabled={sku.stock === 0} />
              </div>
            ))}
            {skus.length === 0 && <p className="text-sm text-neutral-500">DB 版商品尚無 SKU，請到後台補建。</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <a href="/cart" className="flex-1 rounded-full bg-ink-950 py-2.5 text-center text-sm font-bold text-white transition hover:bg-gold-600">前往購物車結帳 →</a>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-ink-700/60">
            <div className="rounded-xl border border-ink-900/10 bg-white p-2.5 shadow-soft">隱密包裝出貨</div>
            <div className="rounded-xl border border-ink-900/10 bg-white p-2.5 shadow-soft">滿千免運・24H出貨</div>
            <div className="rounded-xl border border-ink-900/10 bg-white p-2.5 shadow-soft">綠界安全付款</div>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl font-bold tracking-tight">你可能也喜歡</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((r: any) => (
              <a key={r.slug} href={`/products/${r.slug}`} className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5">
                {r.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.cover_image} alt={r.name} className="h-24 w-full rounded-xl bg-neutral-50 object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-xl bg-neutral-100 text-3xl">📦</div>
                )}
                <div className="mt-2 truncate text-sm font-medium">{r.name}</div>
                <div className="mt-0.5 font-serif font-bold">NT$ {r.base_price}</div>
              </a>
            ))}
          </div>
        </section>
      )}
      {(((product as any).detail_text as string) || ((product as any).detail_images ?? []).length > 0) && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-serif text-xl font-bold">商品介紹</h2>
            <p className="mt-0.5 text-xs text-neutral-400">規格・材質・使用方式・注意事項</p>
          </div>
          <div className="space-y-5 px-6 py-6">
            {(product as any).detail_text ? (
              <p className="whitespace-pre-line text-sm leading-7 text-neutral-700">{(product as any).detail_text}</p>
            ) : null}
            <DetailGallery name={product.name} images={(product as any).detail_images ?? []} />
          </div>
        </section>
      )}
      {([((product as any).cover_image) as string, ...((product as any).images ?? [])].filter(Boolean).length > 0) && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-serif text-xl font-bold">商品圖</h2>
            <p className="mt-0.5 text-xs text-neutral-400">跟上方主圖＋多圖同一組，點圖可放大</p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <DetailGallery name={product.name} images={[((product as any).cover_image) as string, ...((product as any).images ?? [])].filter(Boolean) as string[]} />
          </div>
        </section>
      )}
    </div>
  );
}
