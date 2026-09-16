// Supabase Edge Function: ecpay-create
// GET /functions/v1/ecpay-create?order_id=... (需登入，驗 owner/admin)
// 呼叫方式：前端用登入 session 的 access_token 以 fetch 帶 Authorization 呼叫，
// 拿到 auto-submit HTML 後 document.write（瀏覽器直接跳轉無法帶 header）。
// 回傳 auto-submit HTML form 導向綠界
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';
import { createHash } from 'node:crypto';

function enc(s: string): string {
  return encodeURIComponent(s)
    .replace(/%20/g, '+').replace(/~/g, '%7e').replace(/\(/g, '%28')
    .replace(/\)/g, '%29').replace(/\*/g, '%2a').replace(/!/g, '%21').replace(/'/g, '%27');
}
function checkMac(params: Record<string, string>, key: string, iv: string): string {
  const sorted = Object.keys(params).filter((k) => k !== 'CheckMacValue')
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${key}&${sorted.map((k) => `${k}=${params[k]}`).join('&')}&HashIV=${iv}`;
  return createHash('sha256').update(enc(raw).toLowerCase()).digest('hex').toUpperCase();
}

serve(async (req) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id');
  if (!orderId) return new Response('missing order_id', { status: 400 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 驗呼叫者（Gateway 的 verify_jwt 只驗 token 有效，這裡再驗訂單歸屬，防 A 付 B 的單）
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return new Response('missing token', { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response('invalid token', { status: 401 });

  const { data: order } = await supabase.from('orders').select('*, order_items(*)').eq('id', orderId).single();
  if (!order) return new Response('order not found', { status: 404 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (order.user_id !== user.id && profile?.role !== 'admin') {
    return new Response('forbidden', { status: 403 });
  }

  const merchantID = Deno.env.get('ECPAY_MERCHANT_ID')!;
  const hashKey = Deno.env.get('ECPAY_HASH_KEY')!;
  const hashIV = Deno.env.get('ECPAY_HASH_IV')!;
  const itemName = order.order_items.map((i: any) => `${i.product_name}x${i.qty}`).join('#').slice(0, 200);
  const params: Record<string, string> = {
    MerchantID: merchantID,
    MerchantTradeNo: order.order_no.replace(/-/g, '').slice(0, 20),
    MerchantTradeDate: new Date().toLocaleString('zh-TW', { hour12: false }).replace(/\//g, '/'),
    PaymentType: 'aio',
    TotalAmount: String(order.total),
    TradeDesc: 'SoloShop',
    ItemName: itemName || '商品一批',
    ReturnURL: Deno.env.get('ECPAY_RETURN_URL')!,
    ClientBackURL: Deno.env.get('ECPAY_CLIENT_BACK_URL')!,
    ChoosePayment: 'ALL',
    EncryptType: '1',
  };
  // 綠界日期格式 yyyy/MM/dd HH:mm:ss
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  params.MerchantTradeDate = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  params.CheckMacValue = checkMac(params, hashKey, hashIV);

  await supabase.from('payments').update({ merchant_trade_no: params.MerchantTradeNo }).eq('order_id', orderId);

  const inputs = Object.entries(params).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`).join('');
  const html = `<html><body onload="document.forms[0].submit()"><form method="post" action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5">${inputs}</form></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
});
