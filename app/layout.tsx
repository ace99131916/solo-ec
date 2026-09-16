import type { Metadata } from 'next';
import './globals.css';
import { NAV, SITE } from '@/lib/shop';
import AgeGate from '@/components/AgeGate';
import CartBadge from '@/components/CartBadge';

export const metadata: Metadata = {
  title: `${SITE.name}｜隱密包裝・24H出貨`,
  description: 'Next.js + Supabase 中小型購物車：前台＋會員中心＋管理後台＋綠界金流',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <AgeGate />
        <div className="bg-black py-1 text-center text-xs text-white">{SITE.slogan}｜首購碼 WELCOME100（滿500折100）</div>
        <header className="sticky top-0 z-40 border-b bg-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <a href="/" className="text-lg font-black">{SITE.name}</a>
            <div className="hidden flex-1 items-center gap-3 text-sm lg:flex">
              {NAV.slice(0, 8).map((c) => (
                <a key={c.slug} className="text-neutral-600 hover:text-black" href={`/products?cat=${c.slug}`}>{c.name}</a>
              ))}
            </div>
            <form action="/products" className="hidden md:block">
              <input name="q" placeholder="搜尋商品…" className="rounded-full border px-3 py-1 text-sm" />
            </form>
            <CartBadge />
            <a href="/account" className="text-sm">會員中心</a>
            <a href="/login" className="text-sm text-neutral-500">登入</a>
            <a href="/admin" className="text-sm text-neutral-400">後台</a>
          </nav>
          <div className="border-t bg-neutral-50 lg:hidden">
            <div className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-4 py-2 text-sm">
              {NAV.map((c) => (
                <a key={c.slug} className="whitespace-nowrap text-neutral-600" href={`/products?cat=${c.slug}`}>{c.name}</a>
              ))}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mt-12 border-t bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm md:grid-cols-4">
            <div>
              <div className="font-bold">{SITE.name}</div>
              <p className="mt-1 text-neutral-500">隱密包裝・品名標示為「生活用品」<br />24H 出貨・滿千免運・原廠正貨</p>
            </div>
            <div>
              <div className="font-bold">購物說明</div>
              <ul className="mt-1 space-y-1 text-neutral-600">
                <li><a href="/guide">付款與物流</a></li>
                <li><a href="/guide">退換貨政策（貼身用品拆封恕不退換）</a></li>
                <li><a href="/products">全部商品</a></li>
              </ul>
            </div>
            <div>
              <div className="font-bold">會員服務</div>
              <ul className="mt-1 space-y-1 text-neutral-600">
                <li><a href="/account">訂單查詢</a></li>
                <li><a href="/account">點數查詢（每筆回饋 5%）</a></li>
                <li><a href="/login">登入 / 註冊</a></li>
              </ul>
            </div>
            <div>
              <div className="font-bold">聯絡我們</div>
              <p className="mt-1 text-neutral-600">{SITE.serviceEmail}<br />客服時間 平日 10:00–18:00</p>
            </div>
          </div>
          <div className="border-t py-3 text-center text-xs text-neutral-400">© {new Date().getFullYear()} {SITE.name}・Demo 佔位圖文，上線前請更換・🔞 未滿 18 歲請勿瀏覽</div>
        </footer>
      </body>
    </html>
  );
}
