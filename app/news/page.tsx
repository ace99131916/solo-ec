import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import { getNewsList, formatNewsDate } from '@/lib/news';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '最新資訊',
  description: '商店公告、新品上市、優惠活動等最新資訊。',
  alternates: { canonical: '/news' },
};

export default async function NewsPage() {
  let list: Awaited<ReturnType<typeof getNewsList>> = [];
  try {
    list = await getNewsList(createServerClient(), 50);
  } catch {}
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-[11px] font-bold tracking-[0.28em] text-gold-600">NEWS</div>
      <h1 className="font-serif text-2xl font-bold tracking-tight">最新資訊</h1>
      {!list.length && <p className="text-sm text-ink-700/55">目前還沒有公告，敬請期待。</p>}
      {list.map((n) => (
        <article key={n.id} id={n.slug} className="scroll-mt-24 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-soft">
          <div className="text-xs tracking-[0.15em] text-gold-600">{formatNewsDate(n.published_at ?? n.created_at)}</div>
          <h2 className="mt-1.5 font-serif text-lg font-bold">{n.title}</h2>
          {n.excerpt ? <p className="mt-1 text-sm leading-6 text-ink-700/65">{n.excerpt}</p> : null}
          {n.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.cover_image} alt={n.title} className="mt-3 w-full rounded-xl" loading="lazy" />
          ) : null}
          {n.content ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-700">{n.content}</p> : null}
        </article>
      ))}
    </div>
  );
}
