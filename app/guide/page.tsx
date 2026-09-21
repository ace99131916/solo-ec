import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';
import { getGuides } from '@/lib/guides';
import { getSiteBlocks } from '@/lib/site-blocks';
import { renderRich } from '@/lib/richtext';

export const metadata: Metadata = {
  title: '選購知識專欄・付款與物流說明',
  description: '新手選購攻略、清潔保養、開箱評測怎麼看，以及付款、物流、退換貨與隱私說明。',
  alternates: { canonical: '/guide' },
};

export const dynamic = 'force-dynamic';

export default async function GuidePage() {
  let guides = await getGuidesSafe();
  const { heading, info } = await getGuideHeaderSafe();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">{heading}</h1>
      <div className="rounded-xl bg-white p-5 shadow-sm text-sm space-y-2">
        <b>付款方式</b>
        <p>{info.payment}</p>
        <b>物流方式</b>
        <p>{info.shipping}</p>
        <b>退換貨</b>
        <p>{info.returns}</p>
        <b>隱私</b>
        <p>{info.privacy}</p>
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

async function getGuideHeaderSafe() {
  try {
    const { getGuideInfo: gi } = await import('@/lib/site-blocks');
    const blocks = await getSiteBlocks(createServerClient());
    const b = blocks.find((x) => x.id === 'guideinfo');
    return {
      heading: b?.title ? (b.title.startsWith('💡') ? b.title : `💡 ${b.title}`) : '💡 知識專欄・付款與物流說明',
      info: gi(b),
    };
  } catch {
    const { DEFAULT_GUIDE_INFO } = await import('@/lib/site-blocks');
    return { heading: '💡 知識專欄・付款與物流說明', info: DEFAULT_GUIDE_INFO };
  }
}
