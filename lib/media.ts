// 媒體小工具：圖片 / 影片共用同一個 URL 欄位，用副檔名判斷。
// cover_image 放首圖，images 陣列放多圖＋影片（mp4 / webm / mov）。

const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v'];

export function isVideoUrl(url: string): boolean {
  const clean = url.split('?')[0].toLowerCase();
  return VIDEO_EXT.some((ext) => clean.endsWith(`.${ext}`));
}

export function isImageUrl(url: string): boolean {
  return !!url && !isVideoUrl(url);
}

// 卡片圖兜底：首圖 → 多圖第一張（只取圖片，跳過影片）→ 空
export function cardImage(p: { cover_image?: string | null; images?: string[] | null }): string | null {
  if (p.cover_image) return p.cover_image;
  const img = (p.images ?? []).find((u) => isImageUrl(u));
  return img ?? null;
}
