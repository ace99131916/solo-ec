// 最新資訊：讀 Supabase `news`，表還沒建就回空陣列（首頁該區自動隱藏）。
export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image?: string | null;
  published_at?: string | null;
  created_at: string;
};

export async function getNewsList(supabase: any, limit = 20): Promise<NewsItem[]> {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('id,slug,title,excerpt,content,cover_image,published_at,created_at')
      .eq('is_active', true)
      .order('sort')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as NewsItem[];
  } catch {
    return [];
  }
}

export function formatNewsDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
