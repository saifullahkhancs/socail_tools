import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  _: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params
  const valid = ['youtube', 'instagram', 'tiktok']

  if (!valid.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  try {
    await prisma.platformConnection.delete({ where: { platform } })
    return NextResponse.json({ success: true })
  } catch {
    // Already deleted or doesn't exist
    return NextResponse.json({ success: true })
  }
}
