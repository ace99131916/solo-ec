'use client';
import { useState } from 'react';
import { isVideoUrl } from '@/lib/media';

// 商品介紹圖：直列大圖＋點圖放大燈箱
export default function DetailGallery({ name, images }: { name: string; images: string[] }) {
  const [zoom, setZoom] = useState<string | null>(null);
  if (!images.length) return null;
  return (
    <>
      {images.map((url: string, i: number) => (
        <div key={`${url}-${i}`} className="overflow-hidden rounded-xl bg-neutral-100">
          {isVideoUrl(url) ? (
            <video src={url} controls playsInline preload="metadata" className="max-h-[480px] w-full" />
          ) : (
            <button onClick={() => setZoom(url)} className="block w-full cursor-zoom-in" aria-label={`放大介紹圖 ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${name} 介紹圖 ${i + 1}`} className="w-full" loading="lazy" />
            </button>
          )}
        </div>
      ))}
      {zoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-label="介紹圖放大檢視"
        >
          <button
            onClick={() => setZoom(null)}
            aria-label="關閉"
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-lg text-white hover:bg-white/30"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt={`${name} 介紹圖放大`} className="max-h-[88vh] max-w-[92vw] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
