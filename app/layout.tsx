import type { Metadata } from 'next';
import { Noto_Serif_TC, Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import { NAV, SITE } from '@/lib/shop';
import { getSiteBlocks, DEFAULT_BLOCKS, getFooterPayload } from '@/lib/site-blocks';
import { createServerClient } from '@/lib/supabase';
import AgeGate from '@/components/AgeGate';
import CartBadge from '@/components/CartBadge';
import LineFloat from '@/components/LineFloat';

const serif = Noto_Serif_TC({ subsets: ['latin'], weight: ['600', '700', '900'], variable: '--font-serif' });
const sans = Noto_Sans_TC({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: `${SITE.name}｜隱密包裝・24H出貨`,
  description: 'Next.js + Supabase 中小型購物車：前台＋會員中心＋管理後台＋綠界金流',
};

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let announcement = DEFAULT_BLOCKS.find((b) => b.id === 'announcement')!;
  let lineUrl = '';
  let lineVisible = false;
  let footerPayload = getFooterPayload(undefined);
  try {
    const blocks = await getSiteBlocks(createServerClient());
    const found = blocks.find((b) => b.id === 'announcement');
    if (found) announcement = found;
    const line = blocks.find((b) => b.id === 'line');
    if (line && line.visible && line.title.trim().startsWith('http')) {
      // 自動修正常見填錯格式：line.me/ti/p/~@xxx 或缺 /R/ 一律轉官方格式 line.me/R/ti/p/@xxx
      lineUrl = line.title
        .trim()
        .replace('line.me/ti/p/~@', 'line.me/R/ti/p/@')
        .replace('line.me/ti/p/@', 'line.me/R/ti/p/@');
      lineVisible = true;
    }
    footerPayload = getFooterPayload(blocks.find((b) => b.id === 'footer'));
  } catch {}
  return (
    <html lang="zh-Hant">
      <body className={`${serif.variable} ${sans.variable} min-h-screen bg-cream-50 font-sans text-ink-900 antialiased`}>
        <AgeGate />
        {announcement.visible && (
          <div className="bg-ink-950 py-2 text-center text-[11px] tracking-[0.2em] text-gold-200">
            {announcement.title}{announcement.subtitle ? `｜${announcement.subtitle}` : ''}
          </div>
        )}
        <header className="sticky top-0 z-40 border-b border-ink-900/10 bg-cream-50/85 backdrop-blur-md">
          <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5">
            <a href="/" className="shrink-0 font-serif text-lg font-black tracking-tight">
              {SITE.name}
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-gold-500 align-middle" />
            </a>
            <div className="hidden min-w-0 flex-1 items-center gap-3 overflow-x-auto text-[13px] tracking-wide text-ink-700 [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden">
              {NAV.slice(0, 8).map((c) => (
                <a key={c.slug} className="nav-link shrink-0 whitespace-nowrap hover:text-ink-950" href={`/products?cat=${c.slug}`}>{c.name}</a>
              ))}
            </div>
            <form action="/products" className="hidden shrink-0 items-center gap-1.5 rounded-full border border-ink-900/15 bg-white/70 px-2.5 py-1 text-xs transition focus-within:border-gold-500 md:flex">
              <span className="text-ink-700/60"><SearchIcon /></span>
              <input name="q" placeholder="搜尋…" className="w-20 bg-transparent outline-none placeholder:text-ink-700/40 lg:w-28" />
            </form>
            <span className="shrink-0"><CartBadge /></span>
            <span className="hidden h-4 w-px shrink-0 bg-ink-900/15 sm:block" />
            <a href="/account" className="hidden shrink-0 whitespace-nowrap text-[13px] font-medium hover:text-gold-600 sm:block">會員中心</a>
            <a href="/login" className="shrink-0 whitespace-nowrap rounded-full bg-ink-950 px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-ink-800">登入</a>
          </nav>
          <div className="border-t border-ink-900/5 bg-cream-50 lg:hidden">
            <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 py-2.5 text-[13px]">
              {NAV.map((c) => (
                <a key={c.slug} className="whitespace-nowrap text-ink-700/80" href={`/products?cat=${c.slug}`}>{c.name}</a>
              ))}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">{children}</main>
        <footer className="relative mt-16 overflow-hidden bg-ink-950 text-cream-100">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm md:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <div className="font-serif text-lg font-bold text-white">{SITE.name}</div>
              <p className="mt-3 max-w-xs leading-7 text-cream-100/60">
                {footerPayload.about[0]}
                <br />{footerPayload.about[1]}
                <br />{footerPayload.about[2]}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-gold-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                本日已出貨・匿名包裝處理中
              </div>
            </div>
            {footerPayload.columns.map((col) => (
              <div key={col.heading}>
                <div className="text-xs font-bold tracking-[0.2em] text-gold-300">{col.heading}</div>
                <ul className="mt-3 space-y-2.5 text-cream-100/70">
                  {col.links.map((l) => (
                    <li key={`${l.href}-${l.label}`}><a className="hover:text-white" href={l.href || '#'}>{l.label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <div className="text-xs font-bold tracking-[0.2em] text-gold-300">聯絡我們</div>
              <p className="mt-3 leading-7 text-cream-100/70">{footerPayload.email}<br />{footerPayload.hours}</p>
            </div>
          </div>
          <div className="border-t border-white/10 py-3.5 text-center text-xs tracking-wide text-cream-100/40">
            <span>© {new Date().getFullYear()} {SITE.name}・{footerPayload.copyright}</span>
            <span className="mx-2 text-cream-100/20">|</span>
            <a href="/admin" className="text-cream-100/30 transition hover:text-gold-300">管理員登入</a>
          </div>
        </footer>
        {lineVisible && <LineFloat url={lineUrl} />}
      </body>
    </html>
  );
}

