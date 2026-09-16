// 綠界 ECPay CheckMacValue (SHA256) — 前後端共用
// 文件: 綠界全方位金流技術文件 CheckMacValue 章節
import crypto from 'crypto';

function dotNetUrlEncode(s: string): string {
  // 比照 .NET HttpUtility.UrlEncode：僅 -_.!*() 不編碼，空白轉 +，其餘百分編碼（含 ~ '）
  // 注意：絕不能把 ! * ( ) 轉成 %XX，否則 CheckMacValue 會錯（10200073）
  return encodeURIComponent(s)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');
}

export function ecpayCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string,
  encryptType = '1'
): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== 'CheckMacValue')
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${hashKey}&${sorted
    .map((k) => `${k}=${params[k]}`)
    .join('&')}&HashIV=${hashIV}`;
  const encoded = dotNetUrlEncode(raw).toLowerCase();
  const hash = crypto.createHash('sha256').update(encoded).digest('hex');
  return hash.toUpperCase();
}

export function verifyEcpayCallback(
  body: Record<string, string>,
  hashKey: string,
  hashIV: string
): boolean {
  const { CheckMacValue, ...rest } = body;
  if (!CheckMacValue) return false;
  return (
    ecpayCheckMacValue(rest, hashKey, hashIV) === CheckMacValue.toUpperCase()
  );
}
