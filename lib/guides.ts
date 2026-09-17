// 知識專欄：讀 Supabase `guides`，表還沒建就 fallback 到 lib/shop.ts 的 GUIDES。
import { GUIDES } from '@/lib/shop';

export type Guide = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
};

const FALLBACK: Guide[] = GUIDES.map((g) => ({
  id: g.slug,
  slug: g.slug,
  title: g.title,
  excerpt: g.desc,
  content: '',
}));

export async function getGuides(supabase: any): Promise<Guide[]> {
  try {
    const { data, error } = await supabase
      .from('guides')
      .select('id,slug,title,excerpt,content')
      .eq('is_active', true)
      .order('sort')
      .limit(12);
    if (error || !data?.length) return FALLBACK;
    return data.map((g: any) => ({
      id: String(g.id ?? g.slug),
      slug: g.slug,
      title: g.title,
      excerpt: g.excerpt ?? '',
      content: g.content ?? '',
    }));
  } catch {
    return FALLBACK;
  }
}
