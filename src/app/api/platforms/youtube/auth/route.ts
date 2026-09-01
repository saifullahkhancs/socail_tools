import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/platforms/youtube'

export async function GET() {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(
        '/settings?error=YouTube+API+credentials+not+configured.+Add+YOUTUBE_CLIENT_ID+and+YOUTUBE_CLIENT_SECRET+to+your+.env+file.',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      )
    )
  }
  const url = getAuthUrl()
  return NextResponse.redirect(url)
}
