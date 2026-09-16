import { createServerClient } from '@/lib/supabase';
import { mockProducts } from '@/lib/mock';
import { notFound } from 'next/navigation';
import AddToCart from '@/components/AddToCart';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product: any = mockProducts.find((p) => p.slug === params.slug) ?? null;
  let skus: any[] = product?.skus ?? [];
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('products')
      .select('*, product_skus(*)')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();
    if (data) {
      product = data;
      skus = data.product_skus ?? [];
    }
  } catch {}
  if (!product) return notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex h-72 items-center justify-center rounded-xl bg-white text-6xl shadow-sm">🛍️</div>
      <div>
        <a href="/products" className="text-sm text-blue-600">← 回商品列表</a>
        <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
        <p className="mt-2 text-neutral-600">{product.description}</p>
        <div className="mt-4 space-y-2">
          {skus.map((sku: any) => (
            <div key={sku.id} className="flex items-center justify-between rounded border bg-white px-4 py-2">
              <span className="text-sm">{sku.spec_name}｜NT$ {sku.price}｜庫存 {sku.stock}</span>
              <AddToCart sku_id={sku.id} disabled={sku.stock === 0} />
            </div>
          ))}
          {skus.length === 0 && <p className="text-sm text-neutral-500">DB 版商品尚無 SKU，請到後台補建。</p>}
        </div>
        <a href="/cart" className="mt-4 inline-block rounded bg-black px-4 py-2 text-white">前往購物車結帳 →</a>
      </div>
    </div>
  );
}
