import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getLongLivedToken, getInstagramAccountInfo } from '@/lib/platforms/instagram'
import { prisma } from '@/lib/db'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings?error=Instagram+auth+failed:+${encodeURIComponent(errorDesc ?? error ?? 'unknown')}`, APP_URL)
    )
  }

  try {
    // Exchange short-lived token
    const tokenData = await exchangeCode(code)
    if (!tokenData.access_token) {
      throw new Error(tokenData.error?.message ?? 'No access token')
    }

    // Get long-lived token (60 days)
    const longLivedData = await getLongLivedToken(tokenData.access_token)
    const accessToken = longLivedData.access_token ?? tokenData.access_token

    // Get Instagram account info
    const { accountId, accountName, pageId } = await getInstagramAccountInfo(accessToken)

    // Calculate expiry (long-lived tokens last ~60 days)
    const expiresAt = longLivedData.expires_in
      ? new Date(Date.now() + longLivedData.expires_in * 1000)
      : null

    await prisma.platformConnection.upsert({
      where: { platform: 'instagram' },
      update: {
        accessToken,
        expiresAt,
        accountName,
        accountId,
        extraData: JSON.stringify({ pageId }),
      },
      create: {
        platform: 'instagram',
        accessToken,
        expiresAt,
        accountName,
        accountId,
        extraData: JSON.stringify({ pageId }),
      },
    })

    return NextResponse.redirect(
      new URL('/settings?success=Instagram+Reels+connected+successfully!', APP_URL)
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/settings?error=Instagram+connection+failed:+${encodeURIComponent(msg)}`, APP_URL)
    )
  }
}
