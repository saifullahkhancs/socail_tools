import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const connections = await prisma.platformConnection.findMany()

  const data = connections.map((c) => ({
    platform: c.platform,
    connected: true,
    accountName: c.accountName,
    accountId: c.accountId,
  }))

  const connectedPlatforms = connections.map((c) => c.platform)

  // Fill in disconnected platforms
  const all = ['youtube', 'instagram', 'tiktok']
  const full = all.map((p) => ({
    platform: p,
    connected: connectedPlatforms.includes(p),
    accountName: data.find((d) => d.platform === p)?.accountName ?? '',
    accountId: data.find((d) => d.platform === p)?.accountId ?? '',
  }))

  return NextResponse.json({ connections: full, connected: connectedPlatforms })
}
