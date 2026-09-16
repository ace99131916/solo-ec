import { GUIDES } from '@/lib/shop';

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">💡 知識專欄・付款與物流說明</h1>
      <div className="rounded-xl bg-white p-5 shadow-sm text-sm space-y-2">
        <b>付款方式</b>
        <p>綠界金流：信用卡、ATM 轉帳、超商代碼。訂單成立後自動導向綠界，付款完成由 callback 自動更新為「已付款」。</p>
        <b>物流方式</b>
        <p>宅配（本島 60 元，滿 1000 免運）／超商取貨（7-11、全家、萊爾富、OK）。隱密包裝，品名標示「生活用品」。</p>
        <b>退換貨</b>
        <p>貼身用品拆封恕不退換；瑕疵品 7 日內請拍照聯繫客服換貨。福利品、優惠套組售出恕不退換。</p>
        <b>隱私</b>
        <p>訂單明細不會出現在帳單，帳單顯示為綠界或商城名稱。會員資料僅用於出貨與客服。</p>
      </div>
      {GUIDES.map((g) => (
        <article key={g.slug} className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">{g.title}</h2>
          <p className="mt-1 text-sm text-neutral-600">{g.desc}</p>
          <p className="mt-2 text-sm text-neutral-500">（示範內文，上線前請換成自家 SEO 文章。建議每篇 800–1500 字＋3 張圖＋內連到商品。）</p>
        </article>
      ))}
    </div>
  );
}
