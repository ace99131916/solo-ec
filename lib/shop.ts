// 全站設定：參考 redino.tw + gztoy.tw 合併後的架構
// 照片先用佔位，文字為示範用中性描述（上線前請換成自家商品圖文）
export const SITE = {
  name: 'Solo Shop',
  slogan: '隱密包裝・24H出貨・全館滿千免運',
  serviceEmail: 'service@example.com',
  freeShippingThreshold: 1000,
  shippingFee: 60,
  logo: 'https://uwunxvgjrgvzsmkzauyc.supabase.co/storage/v1/object/public/banners/logo.jpg',
};

export type NavChild = { name: string; slug: string };
export type NavCat = { name: string; slug: string; children: NavChild[] };

// 前台主導覽（對應兩站：男性/女性/後庭/潤滑液/保險套/品牌/排行榜/知識專欄）
export const NAV: NavCat[] = [
  { name: '本期優惠', slug: 'sale', children: [{ name: '滿千免運', slug: 'sale' }, { name: '首購折100', slug: 'sale' }, { name: '福利品專區', slug: 'outlet' }] },
  {
    name: '男性專區', slug: 'men',
    children: [
      { name: '手持式', slug: 'men-hand' }, { name: '電動式', slug: 'men-electric' },
      { name: '口交系列', slug: 'men-oral' }, { name: '美臀系列', slug: 'men-hip' },
      { name: '持久訓練', slug: 'men-training' }, { name: '清潔收納', slug: 'men-care' },
    ],
  },
  {
    name: '女性專區', slug: 'women',
    children: [
      { name: '按摩棒', slug: 'women-wand' }, { name: '跳蛋', slug: 'women-egg' },
      { name: '吸吮系列', slug: 'women-sucker' }, { name: '仿真系列', slug: 'women-dildo' },
      { name: '聰明球', slug: 'women-kegel' }, { name: '私密保養', slug: 'women-care' },
    ],
  },
  {
    name: '後庭專區', slug: 'anal',
    children: [
      { name: '肛塞', slug: 'anal-plug' }, { name: '拉珠', slug: 'anal-beads' },
      { name: '前列腺', slug: 'anal-prostate' }, { name: '矽性潤滑', slug: 'lube-silicone' },
    ],
  },
  {
    name: '潤滑液', slug: 'lube',
    children: [
      { name: '水性潤滑', slug: 'lube-water' }, { name: '矽性潤滑', slug: 'lube-silicone' },
      { name: '按摩油', slug: 'lube-massage' }, { name: '口交用', slug: 'lube-oral' }, { name: '優惠組合', slug: 'lube-combo' },
    ],
  },
  { name: '保險套', slug: 'condom', children: [{ name: '超薄', slug: 'condom-thin' }, { name: '顆粒', slug: 'condom-dot' }, { name: '超值組', slug: 'condom-value' }] },
  { name: '品牌館', slug: 'brand', children: [{ name: '台灣品牌', slug: 'brand-tw' }, { name: '日本品牌', slug: 'brand-jp' }, { name: '歐美品牌', slug: 'brand-eu' }] },
  { name: '排行榜', slug: 'ranking', children: [] },
  { name: '知識專欄', slug: 'guide', children: [{ name: '選購攻略', slug: 'guide-buy' }, { name: '清潔保養', slug: 'guide-care' }, { name: '開箱評測', slug: 'guide-review' }] },
  { name: '全部商品', slug: 'all', children: [] },
];

export const GUIDES = [
  { slug: 'guide-buy', title: '新手選購攻略：先看尺寸、材質、震動強度', desc: '第一次購買建議從入門款開始，注意醫用級矽膠與水洗等級。' },
  { slug: 'guide-care', title: '清潔與保養：中性清潔＋陰涼收納', desc: '使用前後以專用清潔液清洗、擦乾後收納，避免高溫與混放。' },
  { slug: 'guide-review', title: '開箱評測怎麼看：震感、音量、續航', desc: '排行榜僅供參考，實際以個人體感為主，建議看多篇交叉比對。' },
];

export const ORDER_STATUS_ZH: Record<string, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  preparing: '備貨中',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
};
