import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// 擋掉後台/會員/結帳等不該被收錄的頁，其他全開
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/checkout', '/cart', '/login', '/api'],
      },
      // AI 檢索器明確放行（GEO/AEO）
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'anthropic-ai', 'Grok', 'xai', 'PerplexityBot', 'Google-Extended', 'Bytespider'],
        allow: '/',
        disallow: ['/admin', '/account', '/checkout', '/cart', '/login', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
