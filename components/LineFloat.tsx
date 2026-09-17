'use client';

// 右下角固定 LINE 客服浮動鈕（所有頁面顯示，連結由 /admin/site 設定）
export default function LineFloat({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LINE 客服"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#06C755] text-white shadow-lift transition-transform hover:scale-110 active:scale-95"
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 5.64 2 10.13c0 4.02 3.55 7.38 8.35 8.01.33.07.77.22.88.5.1.26.07.67.03.93l-.14.87c-.04.27-.2 1.07.88.58 1.08-.48 5.85-3.45 7.99-5.9C21.44 13.36 22 11.81 22 10.13 22 5.64 17.52 2 12 2Z" />
        <text x="12" y="12.6" textAnchor="middle" fontSize="4.4" fontWeight="800" fill="#06C755" fontFamily="Arial, sans-serif">LINE</text>
      </svg>
    </a>
  );
}
