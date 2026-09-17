'use client';
import { useCallback, useEffect, useState } from 'react';
import { isVideoUrl } from '@/lib/media';

// 商品畫廊：完整顯示不裁切，點縮圖切換，點主圖放大（燈箱可左右切換、Esc 關閉）。
export default function ProductGallery({ name, cover, images }: { name: string; cover?: string | null; images?: string[] }) {
  const list = [cover, ...(images ?? [])].filter(Boolean) as string[];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  const go = useCallback((i: number) => {
    setActive(((i % list.length) + list.length) % list.length);
  }, [list.length]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
      if (e.key === 'ArrowRight') go(active + 1);
      if (e.key === 'ArrowLeft') go(active - 1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [zoom, active, go]);

  if (!list.length) {
    return (
      <div>
        <div className="flex h-72 items-center justify-center rounded-xl bg-white text-6xl shadow-sm">📦</div>
        <p className="mt-2 text-center text-xs text-neutral-400">尚未上傳圖片，請到後台商品管理上傳</p>
      </div>
    );
  }
  const current = list[Math.min(active, list.length - 1)];
  const currentIsVideo = isVideoUrl(current);
  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {currentIsVideo ? (
          <video key={current} src={current} controls playsInline preload="metadata" className="h-80 w-full object-contain md:h-96" />
        ) : (
          <button onClick={() => setZoom(true)} className="group relative block h-80 w-full cursor-zoom-in md:h-96" aria-label="點擊放大圖片">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt={name} className="h-full w-full object-contain" />
            <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
              點擊放大
            </span>
          </button>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-2 grid grid-cols-5 gap-2">
          {list.map((url, i) => (
            <button
              key={`${url}-${i}`}
              onClick={() => setActive(i)}
              aria-label={`查看第 ${i + 1} 個媒體`}
              className={`relative h-16 overflow-hidden rounded-lg border-2 bg-white transition ${i === active ? 'border-gold-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              {isVideoUrl(url) ? (
                <span className="flex h-full w-full items-center justify-center bg-ink-900 text-xs text-white">▶ 影片</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={`${name} ${i + 1}`} className="h-full w-full object-contain" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-label="圖片放大檢視"
        >
          <button
            onClick={() => setZoom(false)}
            aria-label="關閉"
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-lg text-white hover:bg-white/30"
          >
            ×
          </button>
          {list.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); go(active - 1); }}
                aria-label="上一張"
                className="absolute left-2 rounded-full bg-white/15 px-3 py-2 text-lg text-white hover:bg-white/30 md:left-6"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); go(active + 1); }}
                aria-label="下一張"
                className="absolute right-2 rounded-full bg-white/15 px-3 py-2 text-lg text-white hover:bg-white/30 md:right-6"
              >
                ›
              </button>
            </>
          )}
          <div className="max-h-[88vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            {currentIsVideo ? (
              <video key={current} src={current} controls autoPlay playsInline className="max-h-[88vh] max-w-[92vw]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current} alt={name} className="max-h-[88vh] max-w-[92vw] object-contain" />
            )}
            <div className="mt-2 text-center text-xs text-white/60">{active + 1} / {list.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}
