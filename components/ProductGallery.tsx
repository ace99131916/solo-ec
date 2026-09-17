'use client';
import { useState } from 'react';
import { isVideoUrl } from '@/lib/media';

// 商品畫廊：首圖＋縮圖列，圖片和影片混排，點縮圖切換。
export default function ProductGallery({ name, cover, images }: { name: string; cover?: string | null; images?: string[] }) {
  const list = [cover, ...(images ?? [])].filter(Boolean) as string[];
  const [active, setActive] = useState(0);
  if (!list.length) {
    return (
      <div>
        <div className="flex h-72 items-center justify-center rounded-xl bg-white text-6xl shadow-sm">📦</div>
        <p className="mt-2 text-center text-xs text-neutral-400">尚未上傳圖片，請到後台商品管理上傳</p>
      </div>
    );
  }
  const current = list[Math.min(active, list.length - 1)];
  const isVideo = isVideoUrl(current);
  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-black shadow-sm">
        {isVideo ? (
          <video key={current} src={current} controls playsInline preload="metadata" className="h-72 w-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={name} className="h-72 w-full object-cover" />
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-2 grid grid-cols-5 gap-2">
          {list.map((url, i) => (
            <button
              key={`${url}-${i}`}
              onClick={() => setActive(i)}
              aria-label={`查看第 ${i + 1} 個媒體`}
              className={`relative h-16 overflow-hidden rounded-lg border-2 transition ${i === active ? 'border-gold-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              {isVideoUrl(url) ? (
                <span className="flex h-full w-full items-center justify-center bg-ink-900 text-xs text-white">▶ 影片</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
