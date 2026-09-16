import { createServerClient } from '@/lib/supabase';
import { mockBanners, mockProducts } from '@/lib/mock';
import { GUIDES, NAV } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let banners = mockBanners as any[];
  let featured = mockProducts.filter((p) => p.is_featured);
  let cats: { name: string; slug: string }[] = NAV.map((c) => ({ name: c.name, slug: c.slug }));
  try {
    const supabase = createServerClient();
    const { data: b } = await supabase.from('banners').select('*').eq('is_active', true).order('sort').limit(3);
    if (b?.length) banners = b;
    const { data: p } = await supabase.from('products').select('name,slug,base_price,description').eq('is_active', true).eq('is_featured', true).limit(8);
    if (p?.length) {
      featured = p.map((x: any) => ({ name: x.name, slug: x.slug, category: '', description: x.description ?? '', base_price: x.base_price, is_featured: true, skus: [] }));
    }
    const { data: dbCats } = await supabase.from('categories').select('name,slug').eq('is_active', true).order('sort').limit(20);
    if (dbCats?.length) cats = dbCats;
  } catch {}

  return (
    <div className="space-y-8">
      {/* Hero：參考兩站大 Banner + 滿額贈 */}
      <section className="overflow-hidden rounded-2xl bg-black text-white">
        <div className="grid md:grid-cols-2">
          <div className="p-8">
            <div className="text-xs tracking-widest text-neutral-400">9 月購物季・全館 0 元免運載（滿千免運）</div>
            <h1 className="mt-2 text-3xl font-black leading-tight">探索你的心動頻率<br />隱密包裝・24H 出貨</h1>
            <p className="mt-2 text-sm text-neutral-300">每日出貨・匿名包裝・每筆訂單 5% 點數回饋・原廠正貨保固</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/products" className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black">馬上逛逛</a>
              <a href="/products?cat=ranking" className="rounded-full border border-white px-5 py-2 text-sm">暢銷排行</a>
              <a href="/login" className="rounded-full border border-white px-5 py-2 text-sm">會員登入</a>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              {[['滿1000', '隱密收納袋'], ['滿1500', '迷你好禮隨機'], ['滿5000', '高潮好禮隨機']].map(([a, b]) => (
                <div key={a} className="rounded-lg bg-neutral-800 p-2"><b>{a}</b><br />送 {b}</div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            {banners.slice(0, 4).map((b: any) => (
              <a key={b.id} href={b.link_url ?? '/products'} className="flex h-32 items-center justify-center rounded-xl bg-neutral-800 text-center text-sm">🖼️<br />{b.title}</a>
            ))}
          </div>
        </div>
      </section>

      {/* 熱門分類 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">熱門分類</h2>
          <a href="/products" className="text-sm text-blue-600">看全部 →</a>
        </div>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
          {cats.slice(0, 8).map((c) => (
            <a key={c.slug} href={`/products?cat=${c.slug}`} className="rounded-xl bg-white p-3 text-center text-sm shadow-sm hover:shadow">
              <div className="text-2xl">🛍️</div><div className="mt-1">{c.name}</div>
            </a>
          ))}
        </div>
      </section>

      {/* TOP 推薦 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">👑 TOP 推薦</h2>
          <a href="/products" className="text-sm text-blue-600">看全部 →</a>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.map((p) => (
            <a key={p.slug} href={`/products/${p.slug}`} className="rounded-xl bg-white p-4 shadow-sm hover:shadow">
              <div className="flex h-28 items-center justify-center rounded-lg bg-neutral-100 text-4xl">📦</div>
              <div className="mt-2 text-sm font-medium">{p.name}</div>
              <div className="text-sm font-bold text-red-600">NT$ {p.base_price}</div>
              <div className="mt-2 rounded-full bg-black py-1 text-center text-xs text-white">＋ 加入購物車</div>
            </a>
          ))}
        </div>
      </section>

      {/* 品牌旗艦館 */}
      <section>
        <h2 className="mb-3 text-lg font-bold">品牌旗艦館</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {['台灣品牌', '日本品牌', '歐美品牌', '獨家系列'].map((b) => (
            <a key={b} href="/products?cat=brand" className="rounded-xl bg-white p-4 text-center shadow-sm">🏷️<br />{b}</a>
          ))}
        </div>
      </section>

      {/* 知識專欄：兩站都有，用於 SEO */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">💡 情趣知識專欄</h2>
          <a href="/guide" className="text-sm text-blue-600">更多文章 →</a>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {GUIDES.map((g) => (
            <a key={g.slug} href="/guide" className="rounded-xl bg-white p-4 shadow-sm">
              <div className="font-bold">{g.title}</div>
              <div className="mt-1 text-sm text-neutral-500">{g.desc}</div>
            </a>
          ))}
        </div>
      </section>

      {/* 信任徽章 */}
      <section className="grid gap-3 md:grid-cols-4">
        {[
          ['🚚', '宅配＋超商取貨', '結帳可切換，支援門市選擇'],
          ['🎟️', '優惠碼現折', 'WELCOME100 滿500折100'],
          ['🔒', '綠界安全付款', '信用卡/ATM/超商代碼'],
          ['📦', '隱密包裝出貨', '品名標示生活用品'],
        ].map(([i, t, d]) => (
          <div key={t} className="rounded-xl bg-white p-4 shadow-sm"><div className="text-2xl">{i}</div><div className="mt-1 font-bold">{t}</div><div className="text-sm text-neutral-500">{d}</div></div>
        ))}
      </section>
    </div>
  );
}
