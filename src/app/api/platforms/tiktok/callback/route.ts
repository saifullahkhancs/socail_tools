import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getUserInfo } from '@/lib/platforms/tiktok'
import { prisma } from '@/lib/db'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings?error=TikTok+auth+failed:+${encodeURIComponent(errorDesc ?? error ?? 'unknown')}`, APP_URL)
    )
  }

  try {
    const tokenData = await exchangeCode(code)

    if (tokenData.error?.code && tokenData.error.code !== 'ok') {
      throw new Error(tokenData.error.message ?? 'Token exchange failed')
    }

    // Use optional chaining for safer access
    const { access_token, refresh_token, expires_in } = tokenData?.data ?? {}

    if (!access_token) throw new Error('No access_token received from TikTok. The response may be empty or malformed.')

    // Get user info
    const { accountId, accountName } = await getUserInfo(access_token)

    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null

    await prisma.platformConnection.upsert({
      where: { platform: 'tiktok' },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token ?? '',
        expiresAt,
        accountName,
        accountId,
      },
      create: {
        platform: 'tiktok',
        accessToken: access_token,
        refreshToken: refresh_token ?? '',
        expiresAt,
        accountName,
        accountId,
      },
    })

    return NextResponse.redirect(new URL('/settings?success=TikTok+connected+successfully!', APP_URL))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/settings?error=TikTok+connection+failed:+${encodeURIComponent(msg)}`, APP_URL)
    )
  }
}
