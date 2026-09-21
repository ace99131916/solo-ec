// SEO / AEO / GEO 共用：正式網址集中管理
export const SITE_URL = 'https://solo-ec.vercel.app';

export function absUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
