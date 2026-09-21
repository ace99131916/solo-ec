// 內文圖文混排渲染（知識專欄＋最新資訊共用）：
// - 空行分段
// - 獨立一行的圖片 URL 顯示為大圖
// - 行內 URL 自動變連結（商品頁顯示為導購按鈕文字）
const IMG_RE = /^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i;

export function renderRich(text: string, title: string) {
  return text.split(/\n{2,}/).map((para, pi) => {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1 && IMG_RE.test(lines[0])) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={pi} src={lines[0]} alt={`${title} 配圖`} className="w-full rounded-xl" loading="lazy" />
      );
    }
    return (
      <p key={pi} className="text-sm leading-7 text-neutral-700">
        {para.split(/(https?:\/\/\S+)/g).map((part, i) =>
          /^https?:\/\/\S+$/.test(part) ? (
            <a key={i} href={part} className="font-medium text-gold-600 hover:underline">
              {part.includes('/products/') ? '👉 點我去看看這款商品' : part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    );
  });
}
