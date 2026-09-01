import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/platforms/instagram'

export async function GET() {
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
    return NextResponse.redirect(
      new URL(
        '/settings?error=Instagram+API+credentials+not+configured.+Add+INSTAGRAM_APP_ID+and+INSTAGRAM_APP_SECRET+to+your+.env+file.',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      )
    )
  }
  const url = getAuthUrl()
  return NextResponse.redirect(url)
}
