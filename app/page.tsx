import { createServerClient } from '@/lib/supabase';
import { mockBanners, mockProducts } from '@/lib/mock';
import { NAV } from '@/lib/shop';
import { getSiteBlocks, titleClass, getHeroPayload, getEyebrow, DEFAULT_BLOCKS } from '@/lib/site-blocks';
import { getGuides } from '@/lib/guides';
import { getNewsList, formatNewsDate } from '@/lib/news';
import HeroCarousel from '@/components/HeroCarousel';
import { cardImage } from '@/lib/media';
import { SITE_URL } from '@/lib/seo';
import { SITE } from '@/lib/shop';

export const dynamic = 'force-dynamic';

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}

// 分類專區（男性/女性）：標題吃後台設定，商品自動抓該分類最新 4 件含首圖
function ZoneSection({ block, items, catSlug }: { block: any; items: any[]; catSlug: string }) {
  if (!block.visible || !items.length) return null;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="text-[11px] font-bold tracking-[0.28em] text-gold-600">{getEyebrow(block)}</div>
          <h2 className={`mt-1 ${titleClass(block.titleSize)}`}>{block.title}</h2>
          {block.subtitle ? <p className="mt-1 text-sm text-ink-700/60">{block.subtitle}</p> : null}
        </div>
        <a href={`/products?cat=${catSlug}`} className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950">
          看全部 <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
        </a>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((p, i) => (
          <a
            key={p.slug}
            href={`/products/${p.slug}`}
            className={`fade-in-up stagger-${(i % 4) + 1} card-lift group overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-soft`}
          >
            <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-cream-100 to-cream-200">
              {p.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image} alt={p.name} className="absolute inset-0 h-full w-full bg-white object-contain" loading="lazy" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/80 text-4xl text-ink-800 shadow-soft">📦</div>
              )}
            </div>
            <div className="p-4">
              <div className="truncate text-sm font-medium">{p.name}</div>
              <div className="mt-1 font-serif text-base font-bold text-ink-950">NT$ {p.base_price}</div>
              <div className="mt-3 rounded-full bg-ink-950 py-2 text-center text-xs font-medium text-white transition group-hover:bg-gold-600">
                查看詳情
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8h15l-1.5 12.5a1 1 0 0 1-1 .5H8.5a1 1 0 0 1-1-.5L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v5c0 5 3.4 8.4 7 10 3.6-1.6 7-5 7-10V6l-7-3Z" /><path d="m9.5 12 2 2 3.5-4" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6h12v10H2z" /><path d="M14 10h4l4 4v2h-8z" /><circle cx="6.5" cy="18.5" r="1.8" /><circle cx="17.5" cy="18.5" r="1.8" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5Z" /><path d="M13 6v2m0 3v3m0 3v1" strokeDasharray="2 2" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
    </svg>
  );
}

export default async function Home() {
  let banners = mockBanners as any[];
  let featured = mockProducts.filter((p) => p.is_featured);
  let cats: { name: string; slug: string }[] = NAV.map((c) => ({ name: c.name, slug: c.slug }));
  let blocks: Awaited<ReturnType<typeof getSiteBlocks>> = [];
  let guides: Awaited<ReturnType<typeof getGuides>> = [];
  let menProducts: any[] = [];
  let womenProducts: any[] = [];
  let newsList: Awaited<ReturnType<typeof getNewsList>> = [];
  try {
    const supabase = createServerClient();
    blocks = await getSiteBlocks(supabase);
    guides = await getGuides(supabase);
    newsList = await getNewsList(supabase, 3);
    const { data: b } = await supabase.from('banners').select('*').eq('is_active', true).order('sort').limit(5);
    if (b?.length) banners = b;
    const { data: dbCats } = await supabase.from('categories').select('name,slug').eq('is_active', true).order('sort').limit(20);
    if (dbCats?.length) cats = dbCats;
  } catch {}
  // 各區置頂各自獨立查詢（一區失敗不影響其他區；SQL 還沒跑就退回舊精選邏輯）
  try {
    const supabase = createServerClient();
    const { data: p } = await supabase.from('products').select('name,slug,base_price,description,cover_image,images').eq('is_active', true).eq('pin_home', true).order('created_at', { ascending: false }).limit(8);
    if (p?.length) {
      featured = p.map((x: any) => ({ name: x.name, slug: x.slug, category: '', description: x.description ?? '', base_price: x.base_price, cover_image: cardImage(x), is_featured: true, skus: [] }));
    }
  } catch {
    try {
      const supabase = createServerClient();
      const { data: p } = await supabase.from('products').select('name,slug,base_price,description,cover_image,images').eq('is_active', true).eq('is_featured', true).limit(8);
      if (p?.length) {
        featured = p.map((x: any) => ({ name: x.name, slug: x.slug, category: '', description: x.description ?? '', base_price: x.base_price, cover_image: cardImage(x), is_featured: true, skus: [] }));
      }
    } catch {}
  }
  try {
    const supabase = createServerClient();
    // 男性/女性專區：各區置頂優先，其餘按最新補滿 4 件（含首圖）
    for (const [slug, pin, set] of [
      ['men', 'pin_men', (v: any[]) => (menProducts = v)],
      ['women', 'pin_women', (v: any[]) => (womenProducts = v)],
    ] as const) {
      const { data: cp, error } = await supabase
        .from('products')
        .select('name,slug,base_price,cover_image,images,categories!inner(slug)')
        .eq('is_active', true)
        .eq('categories.slug', slug)
        .order(pin, { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4);
      if (!error && cp?.length) {
        set(cp.map((x: any) => ({ ...x, cover_image: cardImage(x) })));
        continue;
      }
      // SQL 還沒跑：退回精選邏輯
      const { data: fb } = await supabase
        .from('products')
        .select('name,slug,base_price,cover_image,images,is_featured,categories!inner(slug)')
        .eq('is_active', true)
        .eq('categories.slug', slug)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4);
      if (fb?.length) set(fb.map((x: any) => ({ ...x, cover_image: cardImage(x) })));
    }
  } catch {}
  if (!blocks.length) blocks = [...DEFAULT_BLOCKS].sort((a, b) => a.sort - b.sort);
  const byId = new Map(blocks.map((bl) => [bl.id, bl]));
  const hero = byId.get('hero')!;
  const catBlock = byId.get('categories')!;
  const featBlock = byId.get('featured')!;
  const guideBlock = byId.get('guides')!;
  const trustBlock = byId.get('trust')!;
  const menBlock = byId.get('men') ?? DEFAULT_BLOCKS.find((b) => b.id === 'men')!;
  const womenBlock = byId.get('women') ?? DEFAULT_BLOCKS.find((b) => b.id === 'women')!;
  const newsBlock = byId.get('news') ?? DEFAULT_BLOCKS.find((b) => b.id === 'news')!;
  const heroPayload = getHeroPayload(hero);

  // GEO/AEO：讓搜尋引擎和 AI 一眼看懂這是什麼站
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE_URL,
    email: 'service@example.com',
    slogan: '隱密包裝・24H出貨・全館滿千免運',
  };
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE_URL,
    inLanguage: 'zh-Hant',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/products?q={query}`,
      'query-input': 'required name=query',
    },
  };

  return (
    <div className="space-y-12 md:space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />
      {/* Hero：標題 / 描述吃後台設定 */}
      {hero.visible && (
      <section className="grain relative overflow-hidden rounded-3xl bg-ink-950 text-cream-50 shadow-lift">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-gold-200/10 blur-[90px]" />
        <div className="relative grid gap-8 p-7 md:grid-cols-[1.15fr_0.85fr] md:p-10">
          <div className="fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] tracking-[0.22em] text-gold-200">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
              {heroPayload.eyebrow}
            </div>
            <h1 className={`mt-4 leading-[1.15] ${titleClass(hero.titleSize)}`}>
              {hero.title}
              <br />
              <span className="mt-1 block text-2xl font-semibold text-cream-100/90 md:text-3xl">隱密包裝・24H 出貨</span>
            </h1>
            {hero.subtitle ? (
              <p className="mt-3 max-w-md text-sm leading-7 text-cream-100/65">{hero.subtitle}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <a href="/products" className="group inline-flex items-center gap-2 rounded-full bg-cream-50 px-6 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-gold-200">
                馬上逛逛
                <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
              </a>
              <a href="/products?cat=ranking" className="rounded-full border border-white/25 px-5 py-2.5 text-sm text-cream-100 transition hover:border-gold-300 hover:text-gold-200">暢銷排行</a>
              <a href="/login" className="rounded-full border border-white/25 px-5 py-2.5 text-sm text-cream-100 transition hover:border-gold-300 hover:text-gold-200">會員登入</a>
            </div>
            <div className="mt-7 grid max-w-md grid-cols-3 gap-2.5 text-center">
              {heroPayload.promos.map((promo, i) => (
                <div key={`${promo.threshold}-${i}`} className={`fade-in-up stagger-${i + 1} rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm`}>
                  <div className="font-serif text-base font-bold text-gold-200">{promo.threshold}</div>
                  <div className="mt-0.5 text-xs text-cream-100/60">送 {promo.gift}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="fade-in-up stagger-2">
            <HeroCarousel banners={banners} />
          </div>
        </div>
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 px-7 py-3.5 text-xs text-cream-100/55 md:px-10">
          <span className="inline-flex items-center gap-1.5"><ShieldIcon /> 匿名包裝出貨</span>
          <span className="inline-flex items-center gap-1.5"><TruckIcon /> 宅配＋超商取貨</span>
          <span className="inline-flex items-center gap-1.5"><TicketIcon /> 首購 WELCOME100</span>
        </div>
      </section>
      )}

      {/* 熱門分類 */}
      {catBlock.visible && (
      <section className="fade-in-up stagger-2">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.28em] text-gold-600">{getEyebrow(catBlock)}</div>
            <h2 className={`mt-1 ${titleClass(catBlock.titleSize)}`}>{catBlock.title}</h2>
            {catBlock.subtitle ? <p className="mt-1 text-sm text-ink-700/60">{catBlock.subtitle}</p> : null}
          </div>
          <a href="/products" className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950">
            看全部 <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
          </a>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {cats.slice(0, 8).map((c) => (
            <a
              key={c.slug}
              href={`/products?cat=${c.slug}`}
              className="card-lift inline-flex shrink-0 items-center gap-2.5 rounded-full border border-ink-900/10 bg-white py-2 pl-2.5 pr-5 text-sm shadow-soft"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 text-gold-300">
                <BagIcon />
              </span>
              <span className="font-medium">{c.name}</span>
            </a>
          ))}
        </div>
      </section>
      )}

      {/* TOP 推薦 */}
      {featBlock.visible && (
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.28em] text-gold-600">{getEyebrow(featBlock)}</div>
            <h2 className={`mt-1 ${titleClass(featBlock.titleSize)}`}>{featBlock.title}</h2>
            {featBlock.subtitle ? <p className="mt-1 text-sm text-ink-700/60">{featBlock.subtitle}</p> : null}
          </div>
          <a href="/products" className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950">
            看全部 <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
          </a>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.map((p, i) => (
            <a
              key={p.slug}
              href={`/products/${p.slug}`}
              className={`fade-in-up stagger-${(i % 4) + 1} card-lift group overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-soft`}
            >
              <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-cream-100 to-cream-200">
                {(p as any).cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(p as any).cover_image} alt={p.name} className="absolute inset-0 h-full w-full bg-white object-contain" loading="lazy" />
                ) : (
                  <>
                    <div className="font-serif text-5xl font-black text-ink-950/10 transition group-hover:scale-110">{String(i + 1).padStart(2, '0')}</div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-ink-800 shadow-soft backdrop-blur">
                        <BoxIcon />
                      </span>
                    </div>
                  </>
                )}
                {i < 3 && (
                  <span className="absolute left-3 top-3 rounded-full bg-ink-950 px-2.5 py-1 text-[11px] font-bold tracking-wide text-gold-300">
                    TOP {i + 1}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="mt-1 font-serif text-base font-bold text-ink-950">NT$ {p.base_price}</div>
                <div className="mt-3 rounded-full bg-ink-950 py-2 text-center text-xs font-medium text-white transition group-hover:bg-gold-600">
                  查看詳情
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
      )}

      {/* 品牌旗艦館已下架（2026-09，占位保留方便日後重開） */}

      <ZoneSection block={menBlock} items={menProducts} catSlug="men" />
      <ZoneSection block={womenBlock} items={womenProducts} catSlug="women" />

      {/* 最新資訊 */}
      {newsBlock.visible && newsList.length > 0 && (
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.28em] text-gold-600">{getEyebrow(newsBlock)}</div>
            <h2 className={`mt-1 ${titleClass(newsBlock.titleSize)}`}>{newsBlock.title}</h2>
            {newsBlock.subtitle ? <p className="mt-1 text-sm text-ink-700/60">{newsBlock.subtitle}</p> : null}
          </div>
          <a href="/news" className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950">
            更多資訊 <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
          </a>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {newsList.slice(0, 3).map((n, i) => (
            <a key={n.id} href={`/news#${n.slug}`} className="card-lift group rounded-2xl border border-ink-900/10 bg-white p-6 shadow-soft">
              <div className="text-xs tracking-[0.15em] text-gold-600">{formatNewsDate(n.published_at ?? n.created_at)}</div>
              <div className="mt-2 font-bold leading-7">{n.title}</div>
              {n.excerpt ? <div className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-700/65">{n.excerpt}</div> : null}
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600">
                閱讀全文 <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
              </div>
            </a>
          ))}
        </div>
      </section>
      )}

      {/* 知識專欄 */}
      {guideBlock.visible && (
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.28em] text-gold-600">{getEyebrow(guideBlock)}</div>
            <h2 className={`mt-1 ${titleClass(guideBlock.titleSize)}`}>{guideBlock.title}</h2>
            {guideBlock.subtitle ? <p className="mt-1 text-sm text-ink-700/60">{guideBlock.subtitle}</p> : null}
          </div>
          <a href="/guide" className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950">
            更多文章 <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
          </a>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {guides.slice(0, 3).map((g, i) => (
            <a key={g.slug} href={`/guide#${g.slug}`} className="card-lift group rounded-2xl border border-ink-900/10 bg-white p-6 shadow-soft">
              <div className="font-serif text-3xl font-black text-gold-500/40">0{i + 1}</div>
              <div className="mt-3 font-bold leading-7">{g.title}</div>
              <div className="mt-2 text-sm leading-6 text-ink-700/65">{g.excerpt}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600">
                閱讀指南 <span className="transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
              </div>
            </a>
          ))}
        </div>
      </section>
      )}

      {/* 信任徽章 */}
      {trustBlock.visible && (
      <section>
        {(trustBlock.title || trustBlock.subtitle) && (
          <div className="mb-4">
            <h2 className={`${titleClass(trustBlock.titleSize)}`}>{trustBlock.title}</h2>
            {trustBlock.subtitle ? <p className="mt-1 text-sm text-ink-700/60">{trustBlock.subtitle}</p> : null}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[
          { icon: <TruckIcon />, t: '宅配＋超商取貨', d: '結帳可切換，支援門市選擇' },
          { icon: <TicketIcon />, t: '優惠碼現折', d: 'WELCOME100 滿500折100' },
          { icon: <ShieldIcon />, t: '綠界安全付款', d: '信用卡 / ATM / 超商代碼' },
          { icon: <BoxIcon />, t: '隱密包裝出貨', d: '品名標示生活用品' },
        ].map((x) => (
          <div key={x.t} className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-100 text-ink-900">{x.icon}</div>
            <div className="mt-3 text-sm font-bold">{x.t}</div>
            <div className="mt-1 text-[13px] leading-5 text-ink-700/60">{x.d}</div>
          </div>
        ))}
        </div>
      </section>
      )}
    </div>
  );
}

