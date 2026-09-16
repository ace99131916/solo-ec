export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="text-6xl">🛍️</div>
      <h1 className="mt-4 text-xl font-bold">找不到這個頁面</h1>
      <p className="mt-1 text-sm text-neutral-500">商品可能已下架，或網址打錯了。</p>
      <div className="mt-4 flex gap-2">
        <a href="/" className="flex-1 rounded border py-2">回首頁</a>
        <a href="/products" className="flex-1 rounded bg-black py-2 text-white">逛全部商品</a>
      </div>
    </div>
  );
}
