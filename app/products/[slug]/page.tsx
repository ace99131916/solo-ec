import { createServerClient } from '@/lib/supabase';
import { mockProducts } from '@/lib/mock';
import { notFound } from 'next/navigation';
import AddToCart from '@/components/AddToCart';
import ProductGallery from '@/components/ProductGallery';
import DetailGallery from '@/components/DetailGallery';

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
          .select('name,slug,base_price,cover_image')
          .eq('is_active', true)
          .eq('category_id', data.category_id)
          .neq('slug', params.slug)
          .limit(4);
        if (rel) related = rel;
      }
    }
  } catch {}
  if (!product) return notFound();

  const minPrice = skus.length ? Math.min(...skus.map((s: any) => s.price)) : product.base_price;
  const totalStock = skus.reduce((s: number, x: any) => s + (x.stock ?? 0), 0);
  const soldOut = skus.length > 0 && totalStock === 0;
  const cat = (product as any).categories;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-neutral-500">
        <a href="/" className="hover:text-black">首頁</a> /{' '}
        <a href="/products" className="hover:text-black">全部商品</a>
        {cat && <> / <a href={`/products?cat=${cat.slug}`} className="hover:text-black">{cat.name}</a></>} / {product.name}
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery name={product.name} cover={(product as any).cover_image} images={(product as any).images} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.is_featured && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">👑 熱銷</span>}
            {soldOut
              ? <span className="rounded-full bg-neutral-300 px-2 py-0.5 text-xs">補貨中</span>
              : totalStock <= 5 && skus.length > 0
                ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">⚠️ 僅剩 {totalStock} 件</span>
                : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">● 有現貨</span>}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{product.name}</h1>
          <div className="mt-1 text-2xl font-black text-red-600">
            NT$ {minPrice}
            {skus.length > 1 && <span className="text-sm font-normal text-neutral-400"> 起</span>}
          </div>
          <p className="mt-2 text-sm text-neutral-600">{product.description}</p>
          <div className="mt-4 space-y-2">
            {skus.map((sku: any) => (
              <div key={sku.id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5">
                <span className="text-sm">
                  {sku.spec_name}｜<b>NT$ {sku.price}</b>｜
                  {sku.stock === 0 ? <span className="text-neutral-400">缺貨</span> : sku.stock <= 5 ? <span className="text-orange-600">剩 {sku.stock}</span> : <span className="text-green-700">有貨</span>}
                </span>
                <AddToCart sku_id={sku.id} disabled={sku.stock === 0} />
              </div>
            ))}
            {skus.length === 0 && <p className="text-sm text-neutral-500">DB 版商品尚無 SKU，請到後台補建。</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <a href="/cart" className="flex-1 rounded-lg bg-black py-2.5 text-center font-bold text-white">前往購物車結帳 →</a>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-neutral-500">
            <div className="rounded-lg bg-white p-2">📦<br />隱密包裝出貨</div>
            <div className="rounded-lg bg-white p-2">🚚<br />滿千免運・24H出貨</div>
            <div className="rounded-lg bg-white p-2">🔒<br />綠界安全付款</div>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold">你可能也喜歡</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((r: any) => (
              <a key={r.slug} href={`/products/${r.slug}`} className="rounded-xl bg-white p-4 shadow-sm hover:shadow">
                {r.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.cover_image} alt={r.name} className="h-24 w-full rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg bg-neutral-100 text-3xl">📦</div>
                )}
                <div className="mt-2 text-sm font-medium">{r.name}</div>
                <div className="font-bold text-red-600">NT$ {r.base_price}</div>
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
    </div>
  );
}
