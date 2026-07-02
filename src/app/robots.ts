import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site-config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Note: '(admin)' / '(auth)' are Next.js route *groups* — they do not
      // appear in URLs. The admin area actually resolves to '/dashboard'.
      { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard'] }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
