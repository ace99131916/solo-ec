// Demo 假資料：沒設 Supabase 環境變數時，可視化初版照樣跑
export const mockBanners = [
  { id: 'b1', title: '開幕慶全館滿千免運', link_url: '/products' },
  { id: 'b2', title: '首購折100：WELCOME100', link_url: '/products' },
];

export type MockSku = {
  id: string;
  sku_code: string;
  spec_name: string;
  price: number;
  stock: number;
};

export type MockProduct = {
  name: string;
  slug: string;
  category: string;
  description: string;
  base_price: number;
  is_featured: boolean;
  skus: MockSku[];
};

export const mockProducts: MockProduct[] = [
  {
    name: '經典白T',
    slug: 'classic-white-tee',
    category: 'tops',
    description: '純棉舒適，百搭款。一人維護 demo 商品。',
    base_price: 590,
    is_featured: true,
    skus: [
      { id: 'sku-tee-m', sku_code: 'TEE-WHITE-M', spec_name: '白色/M', price: 590, stock: 50 },
      { id: 'sku-tee-l', sku_code: 'TEE-WHITE-L', spec_name: '白色/L', price: 590, stock: 50 },
    ],
  },
  {
    name: '直筒牛仔褲',
    slug: 'straight-jeans',
    category: 'bottoms',
    description: '修身直筒，四季可穿。',
    base_price: 1290,
    is_featured: true,
    skus: [{ id: 'sku-jeans-32', sku_code: 'JEANS-32', spec_name: '32吋', price: 1290, stock: 30 }],
  },
  {
    name: '帆布托特包',
    slug: 'canvas-tote',
    category: 'accessories',
    description: '大容量帆布包。',
    base_price: 690,
    is_featured: false,
    skus: [{ id: 'sku-tote', sku_code: 'TOTE-BEIGE', spec_name: '米色/均碼', price: 690, stock: 40 }],
  },
];

export const mockCategories = [
  { slug: 'all', name: '全部' },
  { slug: 'tops', name: '上衣' },
  { slug: 'bottoms', name: '褲裝' },
  { slug: 'accessories', name: '配件' },
];

// 超商門市 mock（正式用綠界門市地圖回傳取代）
export const mockStores = [
  { id: '7-11-001', chain: '7-11', name: '忠孝門市', address: '台北市大安區忠孝東路四段1號' },
  { id: '7-11-002', chain: '7-11', name: '信義門市', address: '台北市信義區信義路五段7號' },
  { id: 'family-001', chain: '全家', name: '敦南門市', address: '台北市大安區敦化南路二段99號' },
  { id: 'family-002', chain: '全家', name: '板橋門市', address: '新北市板橋區文化路一段100號' },
  { id: 'hilife-001', chain: '萊爾富', name: '內湖門市', address: '台北市內湖區成功路三段10號' },
];

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
