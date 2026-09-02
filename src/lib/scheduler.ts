import cron from 'node-cron'
import path from 'path'
import { prisma } from './db'
import { uploadShort as uploadYouTube } from './platforms/youtube'
import { publishReel as publishInstagram } from './platforms/instagram'
import { uploadVideo as uploadTikTok } from './platforms/tiktok'

// Singleton guard - prevent double init in dev hot reload
const g = globalThis as unknown as { schedulerRunning?: boolean }

export function initScheduler() {
  if (g.schedulerRunning) {
    console.log('[Scheduler] Already running, skipping init')
    return
  }
  g.schedulerRunning = true

  console.log('[Scheduler] Starting - checking every minute for due posts')

  // Run every minute
  cron.schedule('* * * * *', async () => {
    await processDuePosts()
  })
}

async function processDuePosts() {
  try {
    const now = new Date()

    // Find all pending posts that are due
    const duePosts = await prisma.post.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: now },
      },
      include: { results: true },
    })

    if (duePosts.length === 0) return

    console.log(`[Scheduler] Found ${duePosts.length} post(s) to publish`)

    for (const post of duePosts) {
      await publishPost(post)
    }
  } catch (err) {
    console.error('[Scheduler] Error processing posts:', err)
  }
}

async function publishPost(post: {
  id: string
  title: string
  caption: string
  hashtags: string
  videoPath: string
  videoUrl: string
  platforms: string
  youtubeTitle: string
  instagramCaption: string
  tiktokCaption: string
}) {
  const platforms: string[] = JSON.parse(post.platforms)
  console.log(`[Scheduler] Publishing post ID: ${post.id} to platforms: ${platforms.join(', ')}`)

  const videoPath = path.join(process.cwd(), 'public', post.videoPath.replace('/uploads/', 'uploads/'))
  console.log(`[Scheduler][${post.id}] Resolved video path: ${videoPath}`)

  // Mark as posting
  await prisma.post.update({
    where: { id: post.id },
    data: { status: 'posting' },
  })
  console.log(`[Scheduler][${post.id}] Status changed to posting`)

  // Create result records for each platform (skip if already exists)
  for (const p of platforms) {
    const existing = await prisma.postResult.findFirst({ where: { postId: post.id, platform: p } })
    if (!existing) {
      await prisma.postResult.create({ data: { postId: post.id, platform: p, status: 'pending' } })
      console.log(`[Scheduler][${post.id}] Created ${p} job result record`)
    }
  }

  let allSuccess = true
  const caption = post.caption + (post.hashtags ? `\n\n${post.hashtags}` : '')

  for (const platform of platforms) {
    try {
      const connection = await prisma.platformConnection.findUnique({
        where: { platform },
      })

      if (!connection) {
        const error = `Account for ${platform} is not connected. Go to Settings and connect the account before scheduling a job.`
        console.error(`[Scheduler][${post.id}] ${error}`)
        await updateResult(post.id, platform, 'failed', '', '', error)
        allSuccess = false
        continue
      }

      console.log(`[Scheduler][${post.id}] Found ${platform} connection`, {
        accountId: connection.accountId || '(not returned by platform)',
        hasAccessToken: Boolean(connection.accessToken),
        hasRefreshToken: Boolean(connection.refreshToken),
        tokenExpiresAt: connection.expiresAt?.toISOString() ?? null,
      })

      let platformId = ''
      let platformUrl = ''

      if (platform === 'youtube') {
        const ytTitle = post.youtubeTitle || post.title
        const ytDesc = post.caption + (post.hashtags ? `\n\n${post.hashtags}` : '')
        console.log(`[Scheduler][${post.id}] Attempting to post to YouTube with title: "${ytTitle}"`)

        const result = await uploadYouTube({
          videoPath,
          title: ytTitle,
          description: ytDesc,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken || undefined,
          onTokens: (tokens) => {
            // Google rotates access tokens; persisting them prevents the next scheduled job from using an expired token.
            void prisma.platformConnection.update({
              where: { platform: 'youtube' },
              data: {
                accessToken: tokens.access_token || connection.accessToken,
                refreshToken: tokens.refresh_token || connection.refreshToken,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : connection.expiresAt,
              },
            }).catch((tokenError) => {
              console.error(`[Scheduler][${post.id}] Could not save refreshed YouTube token`, tokenError)
            })
          },
        })
        platformId = result.videoId
        platformUrl = result.videoUrl
      } else if (platform === 'instagram') {
        const igCaption = post.instagramCaption || caption
        const publicVideoUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${post.videoUrl}`
        console.log(`[Scheduler][${post.id}] Attempting to post to Instagram with video URL: ${publicVideoUrl}`)

        const extra = connection.extraData ? JSON.parse(connection.extraData) : {}
        const result = await publishInstagram({
          igUserId: connection.accountId,
          videoUrl: publicVideoUrl,
          caption: igCaption,
          accessToken: connection.accessToken,
        })
        platformId = result.mediaId
        platformUrl = result.postUrl
      } else if (platform === 'tiktok') {
        const ttCaption = post.tiktokCaption || caption
        console.log(`[Scheduler][${post.id}] Attempting to post to TikTok with caption: "${ttCaption}"`)

        const result = await uploadTikTok({
          videoPath,
          caption: ttCaption,
          accessToken: connection.accessToken,
        })
        platformId = result.publishId
        platformUrl = result.videoUrl
      }

      await updateResult(post.id, platform, 'posted', platformId, platformUrl, '')
      console.log(`[Scheduler][${post.id}] ✅ Successfully posted to ${platform}: ${platformUrl}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // Log the full error object for more details, especially for Google APIs
      console.error(`[Scheduler][${post.id}] ❌ Failed to post to ${platform}. Error: ${message}`, err)
      await updateResult(post.id, platform, 'failed', '', '', message)
      allSuccess = false
    }
  }

  // Update post status
  await prisma.post.update({
    where: { id: post.id },
    data: { status: allSuccess ? 'posted' : 'failed' },
  })
  console.log(`[Scheduler][${post.id}] Job complete with status: ${allSuccess ? 'posted' : 'failed'}`)
}

async function updateResult(
  postId: string,
  platform: string,
  status: string,
  platformId: string,
  platformUrl: string,
  error: string
) {
  // Try to update existing record first
  const existing = await prisma.postResult.findFirst({
    where: { postId, platform },
  })

  if (existing) {
    await prisma.postResult.update({
      where: { id: existing.id },
      data: {
        status,
        platformId,
        platformUrl,
        error,
        postedAt: status === 'posted' ? new Date() : undefined,
      },
    })
  } else {
    await prisma.postResult.create({
      data: {
        postId,
        platform,
        status,
        platformId,
        platformUrl,
        error,
        postedAt: status === 'posted' ? new Date() : undefined,
      },
    })
  }
}
