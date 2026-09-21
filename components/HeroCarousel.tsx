'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type HeroBanner = {
  id?: string;
  title: string;
  image_url?: string | null;
  link_url?: string | null;
};

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === 'left' ? <path d="M19 12H5" /> : <path d="M5 12h14" />}
      {dir === 'left' ? <path d="m11 6-6 6 6 6" /> : <path d="m13 6 6 6-6 6" />}
    </svg>
  );
}

// 首頁 Hero 右側自動輪播照片牆：有圖顯示圖，沒圖顯示質感漸層＋標題。
// 點擊整張投影片即前往 link_url（可填 /products/商品slug 連到指定商品頁）。
export default function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const items = banners.slice(0, 5);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((i: number) => {
    setIndex(((i % items.length) + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer.current = setInterval(() => setIndex((v) => (v + 1) % items.length), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, items.length]);

  if (!items.length) return null;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-800"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((b, i) => (
          <a
            key={b.id ?? i}
            href={b.link_url || '/products'}
            className="relative block h-[300px] w-full shrink-0 md:h-[340px]"
            aria-label={b.title}
          >
            {b.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.image_url} alt={b.title} className="absolute inset-0 h-full w-full bg-ink-800 object-contain" loading={i === 0 ? 'eager' : 'lazy'} />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-950" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(176,141,87,0.28),transparent_60%)]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-5 pt-14">
              <div className="text-[11px] tracking-[0.2em] text-gold-300">精選 {String(i + 1).padStart(2, '0')}</div>
              <div className="mt-1 font-serif text-lg font-bold leading-snug text-white">{b.title}</div>
              <div className="mt-1.5 text-xs text-cream-100/70">查看詳情 →</div>
            </div>
          </a>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={() => go(index - 1)}
            aria-label="上一張"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/65 focus:opacity-100"
          >
            <Arrow dir="left" />
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label="下一張"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/65 focus:opacity-100"
          >
            <Arrow dir="right" />
          </button>
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
            {items.map((b, i) => (
              <button
                key={b.id ?? i}
                onClick={() => go(i)}
                aria-label={`跳到第 ${i + 1} 張`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-gold-300' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
