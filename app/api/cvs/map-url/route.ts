import { NextResponse } from 'next/server';

// 產生綠界超商門市地圖所需參數（前端用 auto-submit form 開新視窗）
// 正式 LogisticsType/LogisticsSubType 依綠界文件：UNIMART/FAMI/HILIFE + 常溫 CROSS/代碼
// Stage: https://logistics-stage.ecpay.com.tw/Express/map
export async function POST(req: Request) {
  const { logisticsType = 'CVS', logisticsSubType = 'UNIMART', isCollection = 'Y' } = await req.json().catch(() => ({}));
  const merchantID = process.env.ECPAY_MERCHANT_ID ?? '3002607';
  const returnURL = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/checkout/cvs-callback`;
  return NextResponse.json({
    ok: true,
    action: 'https://logistics-stage.ecpay.com.tw/Express/map',
    fields: {
      MerchantID: merchantID,
      MerchantTradeNo: `MAP${Date.now().toString().slice(-10)}`,
      LogisticsType: logisticsType,
      LogisticsSubType: logisticsSubType,
      IsCollection: isCollection,
      ServerReplyURL: returnURL,
    },
    note: '正式上線把 action 換成 https://logistics.ecpay.com.tw/Express/map，並用當次訂單編號當 MerchantTradeNo。',
  });
}
