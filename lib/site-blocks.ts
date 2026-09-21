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
  // 各區自訂欄位：hero 用 HeroPayload、footer 用 FooterPayload
  payload?: any;
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

// 各區標題上方的英文小標（CURATED / TOP SELECTION…），存 payload.eyebrow，後台可改
const DEFAULT_EYEBROWS: Record<string, string> = {
  categories: 'CURATED',
  featured: 'TOP SELECTION',
  men: 'FOR HIM',
  women: 'FOR HER',
  news: 'NEWS',
  guides: 'JOURNAL',
};

export const EYEBROW_EDITABLE_IDS = ['categories', 'featured', 'men', 'women', 'news', 'guides'];

export function getEyebrow(block?: SiteBlock): string {
  if (!block || !(block.id in DEFAULT_EYEBROWS)) return '';
  const raw = (block.payload as any)?.eyebrow;
  if (typeof raw === 'string' && raw) return raw;
  return DEFAULT_EYEBROWS[block.id];
}

export type FooterLink = { label: string; href: string };
export type FooterColumn = { heading: string; links: FooterLink[] };

export type FooterPayload = {
  about?: string[];
  email?: string;
  hours?: string;
  copyright?: string;
  columns?: FooterColumn[];
};

export const DEFAULT_FOOTER_PAYLOAD: Required<FooterPayload> = {
  about: [
    '隱密包裝・品名標示為「生活用品」',
    '24H 出貨・滿千免運・原廠正貨',
    '每筆訂單 5% 點數回饋',
  ],
  email: 'service@example.com',
  hours: '客服時間 平日 10:00–18:00',
  copyright: 'Demo 佔位圖文，上線前請更換・未滿 18 歲請勿瀏覽',
  columns: [
    {
      heading: '購物說明',
      links: [
        { label: '付款與物流', href: '/guide' },
        { label: '退換貨政策（貼身用品拆封恕不退換）', href: '/guide' },
        { label: '全部商品', href: '/products' },
      ],
    },
    {
      heading: '會員服務',
      links: [
        { label: '訂單查詢', href: '/account' },
        { label: '點數查詢（每筆回饋 5%）', href: '/account' },
        { label: '登入 / 註冊', href: '/login' },
      ],
    },
  ],
};

export function getFooterPayload(block?: SiteBlock): Required<FooterPayload> {
  const p = (block?.payload ?? {}) as FooterPayload;
  const about = Array.isArray(p.about) && p.about.length ? p.about.slice(0, 3) : DEFAULT_FOOTER_PAYLOAD.about;
  const columns = Array.isArray(p.columns) && p.columns.length ? p.columns.slice(0, 2) : DEFAULT_FOOTER_PAYLOAD.columns;
  return {
    about: [0, 1, 2].map((i) => (typeof about[i] === 'string' && about[i] ? about[i] : DEFAULT_FOOTER_PAYLOAD.about[i])),
    email: typeof p.email === 'string' && p.email ? p.email : DEFAULT_FOOTER_PAYLOAD.email,
    hours: typeof p.hours === 'string' && p.hours ? p.hours : DEFAULT_FOOTER_PAYLOAD.hours,
    copyright: typeof p.copyright === 'string' && p.copyright ? p.copyright : DEFAULT_FOOTER_PAYLOAD.copyright,
    columns: columns.map((c, ci) => ({
      heading: typeof c.heading === 'string' && c.heading ? c.heading : DEFAULT_FOOTER_PAYLOAD.columns[ci]?.heading ?? '',
      links: (Array.isArray(c.links) ? c.links : []).slice(0, 6).map((l) => ({
        label: String(l.label ?? ''),
        href: String(l.href ?? ''),
      })).filter((l) => l.label),
    })),
  };
}

export const BLOCK_IDS = ['announcement', 'line', 'hero', 'categories', 'featured', 'men', 'women', 'news', 'guides', 'trust', 'footer'] as const;

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
    id: 'line',
    title: '',
    subtitle: '',
    visible: false,
    sort: 0,
    titleSize: 'sm',
    theme: 'light',
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
    id: 'men',
    title: '男性專區',
    subtitle: '',
    visible: true,
    sort: 45,
    titleSize: 'md',
    theme: 'light',
  },
  {
    id: 'women',
    title: '女性專區',
    subtitle: '',
    visible: true,
    sort: 46,
    titleSize: 'md',
    theme: 'light',
  },
  {
    id: 'news',
    title: '最新資訊',
    subtitle: '',
    visible: true,
    sort: 47,
    titleSize: 'md',
    theme: 'light',
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
  {
    id: 'footer',
    title: '',
    subtitle: '',
    visible: true,
    sort: 70,
    titleSize: 'sm',
    theme: 'dark',
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
