import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getChannelInfo } from '@/lib/platforms/youtube'
import { prisma } from '@/lib/db'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL(`/settings?error=YouTube+auth+failed:+${error}`, APP_URL))
  }

  try {
    const tokens = await exchangeCode(code)

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Get channel info
    const { accountId, accountName } = await getChannelInfo(
      tokens.access_token,
      tokens.refresh_token ?? undefined
    )

    // Save to DB
    await prisma.platformConnection.upsert({
      where: { platform: 'youtube' },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? '',
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accountName,
        accountId,
      },
      create: {
        platform: 'youtube',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? '',
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accountName,
        accountId,
      },
    })

    return NextResponse.redirect(new URL('/settings?success=YouTube+connected+successfully!', APP_URL))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(new URL(`/settings?error=YouTube+connection+failed:+${encodeURIComponent(msg)}`, APP_URL))
  }
}
