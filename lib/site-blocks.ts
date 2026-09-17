// 首頁區塊可設定系統（完整編輯器的底層）
// 每個區塊：文字內容 + 標題大小 + 配色主題 + 顯示開關 + 排序
// 資料存 Supabase `site_blocks`，讀不到（表還沒建）就用 DEFAULT_BLOCKS，網站不會壞。

export type TitleSize = 'sm' | 'md' | 'lg';
export type BlockTheme = 'light' | 'dark' | 'gold';

export type SiteBlock = {
  id: string;
  title: string;
  subtitle: string;
  visible: boolean;
  sort: number;
  titleSize: TitleSize;
  theme: BlockTheme;
  payload?: HeroPayload;
};

export type HeroPromo = { threshold: string; gift: string };

export type HeroPayload = {
  eyebrow?: string;
  promos?: HeroPromo[];
};

export const DEFAULT_HERO_PAYLOAD: Required<HeroPayload> = {
  eyebrow: '9 月購物季・滿千免運',
  promos: [
    { threshold: '滿1000', gift: '隱密收納袋' },
    { threshold: '滿1500', gift: '迷你好禮隨機' },
    { threshold: '滿5000', gift: '高質感好禮' },
  ],
};

export function getHeroPayload(block?: SiteBlock): Required<HeroPayload> {
  const p = (block?.payload ?? {}) as HeroPayload;
  const promos = Array.isArray(p.promos) && p.promos.length ? p.promos.slice(0, 3) : DEFAULT_HERO_PAYLOAD.promos;
  return {
    eyebrow: typeof p.eyebrow === 'string' && p.eyebrow ? p.eyebrow : DEFAULT_HERO_PAYLOAD.eyebrow,
    promos: promos.map((m) => ({
      threshold: String(m.threshold ?? ''),
      gift: String(m.gift ?? ''),
    })),
  };
}

export const BLOCK_IDS = ['announcement', 'hero', 'categories', 'featured', 'brands', 'guides', 'trust'] as const;

export const DEFAULT_BLOCKS: SiteBlock[] = [
  {
    id: 'announcement',
    title: '隱密包裝・24H出貨・全館滿千免運',
    subtitle: '首購碼 WELCOME100（滿500折100）',
    visible: true,
    sort: 5,
    titleSize: 'sm',
    theme: 'dark',
  },
  {
    id: 'hero',
    title: '探索你的心動頻率',
    subtitle: '每日出貨・匿名包裝・每筆訂單 5% 點數回饋・原廠正貨保固。',
    visible: true,
    sort: 10,
    titleSize: 'lg',
    theme: 'dark',
  },
  {
    id: 'categories',
    title: '熱門分類',
    subtitle: '',
    visible: true,
    sort: 20,
    titleSize: 'md',
    theme: 'light',
  },
  {
    id: 'featured',
    title: '本週 TOP 推薦',
    subtitle: '',
    visible: true,
    sort: 30,
    titleSize: 'md',
    theme: 'light',
  },
  {
    id: 'brands',
    title: '品牌旗艦館',
    subtitle: '原廠正貨・分區選購更快',
    visible: true,
    sort: 40,
    titleSize: 'md',
    theme: 'dark',
  },
  {
    id: 'guides',
    title: '選購知識專欄',
    subtitle: '',
    visible: true,
    sort: 50,
    titleSize: 'md',
    theme: 'light',
  },
  {
    id: 'trust',
    title: '購物保障',
    subtitle: '',
    visible: true,
    sort: 60,
    titleSize: 'sm',
    theme: 'light',
  },
];

export function mergeBlocks(rows?: any[] | null): SiteBlock[] {
  const byId = new Map((rows ?? []).map((r: any) => [r.id, r]));
  return DEFAULT_BLOCKS.map((d) => {
    const r = byId.get(d.id) as any;
    if (!r) return d;
    return {
      id: d.id,
      title: typeof r.title === 'string' ? r.title : d.title,
      subtitle: typeof r.subtitle === 'string' ? r.subtitle : d.subtitle,
      visible: typeof r.visible === 'boolean' ? r.visible : d.visible,
      sort: typeof r.sort === 'number' ? r.sort : d.sort,
      titleSize: ['sm', 'md', 'lg'].includes(r.title_size) ? r.title_size : d.titleSize,
      theme: ['light', 'dark', 'gold'].includes(r.theme) ? r.theme : d.theme,
      payload: (r.payload ?? undefined) as SiteBlock['payload'],
    };
  }).sort((a, b) => a.sort - b.sort);
}

export async function getSiteBlocks(supabase: any): Promise<SiteBlock[]> {
  try {
    const { data, error } = await supabase.from('site_blocks').select('*');
    if (error) return [...DEFAULT_BLOCKS].sort((a, b) => a.sort - b.sort);
    return mergeBlocks(data);
  } catch {
    return [...DEFAULT_BLOCKS].sort((a, b) => a.sort - b.sort);
  }
}

export function titleClass(size: TitleSize): string {
  if (size === 'lg') return 'font-serif text-4xl font-black tracking-tight md:text-5xl';
  if (size === 'sm') return 'font-serif text-xl font-bold tracking-tight';
  return 'font-serif text-2xl font-bold tracking-tight';
}

export const THEME_OPTIONS: { value: BlockTheme; label: string }[] = [
  { value: 'light', label: '淺色（米白）' },
  { value: 'dark', label: '深色（墨黑）' },
  { value: 'gold', label: '金色（香檳）' },
];

export const SIZE_OPTIONS: { value: TitleSize; label: string }[] = [
  { value: 'sm', label: '小' },
  { value: 'md', label: '中' },
  { value: 'lg', label: '大' },
];
