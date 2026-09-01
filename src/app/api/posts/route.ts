import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const posts = await prisma.post.findMany({
    include: { results: true },
    orderBy: { scheduledAt: 'asc' },
  })
  return NextResponse.json({ posts })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      caption,
      hashtags,
      videoUrl,
      videoPath,
      platforms,
      scheduledAt,
      youtubeTitle,
      instagramCaption,
      tiktokCaption,
    } = body

    if (!title || !videoUrl || !platforms?.length || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const post = await prisma.post.create({
      data: {
        title,
        caption: caption ?? '',
        hashtags: hashtags ?? '',
        videoUrl,
        videoPath: videoPath ?? videoUrl,
        platforms: JSON.stringify(platforms),
        scheduledAt: new Date(scheduledAt),
        youtubeTitle: youtubeTitle ?? '',
        instagramCaption: instagramCaption ?? '',
        tiktokCaption: tiktokCaption ?? '',
        status: 'pending',
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (err: unknown) {
    console.error('POST /api/posts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
