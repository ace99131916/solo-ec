'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="text-6xl">😵</div>
      <h1 className="mt-4 text-xl font-bold">出了點問題</h1>
      <p className="mt-1 text-sm text-neutral-500">請重試一次，若持續發生請聯繫客服。</p>
      <div className="mt-4 flex gap-2">
        <button onClick={reset} className="flex-1 rounded bg-black py-2 text-white">重試</button>
        <a href="/" className="flex-1 rounded border py-2">回首頁</a>
      </div>
    </div>
  );
}
