import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase';
import { SITE_URL } from '@/lib/seo';

// 動態 sitemap：首頁＋商品列表＋知識專欄＋全部分類/商品/文章（上架中的）
// 沒接上資料庫就退回基本三頁，絕不報錯
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/guide`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/news`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
  ];
  try {
    const supabase = createServerClient();
    const [cats, prods, guides, news] = await Promise.all([
      supabase.from('categories').select('slug').eq('is_active', true).limit(100),
      supabase.from('products').select('slug,updated_at').eq('is_active', true).order('updated_at', { ascending: false }).limit(1000),
      supabase.from('guides').select('slug').eq('is_active', true).limit(100),
      supabase.from('news').select('slug').eq('is_active', true).limit(100),
    ]);
    const catUrls = (cats.data ?? []).map((c: any) => ({
      url: `${SITE_URL}/products?cat=${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
    const prodUrls = (prods.data ?? []).map((p: any) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    const guideUrls = (guides.data ?? []).map((g: any) => ({
      url: `${SITE_URL}/guide#${g.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
    const newsUrls = (news.data ?? []).map((g: any) => ({
      url: `${SITE_URL}/news#${g.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
    return [...base, ...catUrls, ...prodUrls, ...guideUrls, ...newsUrls];
  } catch {
    return base;
  }
}
