export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const links = [
    ['總覽', '/admin'],
    ['首頁版面', '/admin/site'],
    ['最新資訊', '/admin/news'],
    ['知識專欄', '/admin/guides'],
    ['訂單管理', '/admin/orders'],
    ['商品管理', '/admin/products'],
    ['分類管理', '/admin/categories'],
    ['優惠券', '/admin/coupons'],
    ['會員管理', '/admin/members'],
    ['Banner', '/admin/banners'],
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 font-bold">管理後台</div>
        <nav className="space-y-2 text-sm">
          {links.map(([t, h]) => <a key={h} className="block rounded px-2 py-1 hover:bg-neutral-100" href={h}>{t}</a>)}
        </nav>
        <p className="mt-4 text-xs text-neutral-400">圖片請先上傳 Supabase Storage（product-images / banners）後貼 URL。</p>
      </aside>
      <section>{children}</section>
    </div>
  );
}
