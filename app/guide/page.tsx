import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import { getGuides } from '@/lib/guides';

export const metadata: Metadata = {
  title: '選購知識專欄・付款與物流說明',
  description: '新手選購攻略、清潔保養、開箱評測怎麼看，以及付款、物流、退換貨與隱私說明。',
  alternates: { canonical: '/guide' },
};

export const dynamic = 'force-dynamic';

const IMG_RE = /^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i;

// 內文渲染：空行分段；獨立一行的圖片 URL 顯示為圖片；行內 URL 自動變連結
function renderRich(text: string, title: string) {
  return text.split(/\n{2,}/).map((para, pi) => {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1 && IMG_RE.test(lines[0])) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={pi} src={lines[0]} alt={`${title} 配圖`} className="w-full rounded-xl" loading="lazy" />
      );
    }
    return (
      <p key={pi} className="text-sm leading-7 text-neutral-700">
        {para.split(/(https?:\/\/\S+)/g).map((part, i) =>
          /^https?:\/\/\S+$/.test(part) ? (
            <a key={i} href={part} className="font-medium text-gold-600 hover:underline">
              {part.includes('/products/') ? '👉 點我去看看這款商品' : part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export default async function GuidePage() {
  let guides = await getGuidesSafe();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">💡 知識專欄・付款與物流說明</h1>
      <div className="rounded-xl bg-white p-5 shadow-sm text-sm space-y-2">
        <b>付款方式</b>
        <p>綠界金流：信用卡、ATM 轉帳、超商代碼。訂單成立後自動導向綠界，付款完成由 callback 自動更新為「已付款」。</p>
        <b>物流方式</b>
        <p>宅配（本島 60 元，滿 1000 免運）／超商取貨（7-11、全家、萊爾富、OK）。隱密包裝，品名標示「生活用品」。</p>
        <b>退換貨</b>
        <p>貼身用品拆封恕不退換；瑕疵品 7 日內請拍照聯繫客服換貨。福利品、優惠套組售出恕不退換。</p>
        <b>隱私</b>
        <p>訂單明細不會出現在帳單，帳單顯示為綠界或商城名稱。會員資料僅用於出貨與客服。</p>
      </div>
      {guides.map((g) => (
        <article key={g.slug} id={g.slug} className="scroll-mt-24 space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">{g.title}</h2>
          <p className="text-sm text-neutral-600">{g.excerpt}</p>
          {g.content ? renderRich(g.content, g.title) : null}
        </article>
      ))}
    </div>
  );
}

async function getGuidesSafe() {
  try {
    return await getGuides(createServerClient());
  } catch {
    const { GUIDES } = await import('@/lib/shop');
    return GUIDES.map((g) => ({ id: g.slug, slug: g.slug, title: g.title, excerpt: g.desc, content: '' }));
  }
}
