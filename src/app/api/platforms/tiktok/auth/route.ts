import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/platforms/tiktok'

export async function GET() {
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(
        '/settings?error=TikTok+API+credentials+not+configured.+Add+TIKTOK_CLIENT_KEY+and+TIKTOK_CLIENT_SECRET+to+your+.env+file.',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      )
    )
  }
  const url = getAuthUrl()
  return NextResponse.redirect(url)
}
