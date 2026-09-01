import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import fs from 'fs'

function createOAuthClient() {
  return new OAuth2Client(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/platforms/youtube/callback'
  )
}

export function getAuthUrl(): string {
  const oauth2Client = createOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Always show consent to get refresh token
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  })
}

export async function exchangeCode(code: string) {
  const oauth2Client = createOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getChannelInfo(accessToken: string, refreshToken?: string) {
  const oauth2Client = createOAuthClient()
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  const res = await youtube.channels.list({ part: ['snippet'], mine: true })
  const channel = res.data.items?.[0]
  return {
    accountId: channel?.id ?? '',
    accountName: channel?.snippet?.title ?? 'YouTube Channel',
  }
}

export async function uploadShort({
  videoPath,
  title,
  description,
  accessToken,
  refreshToken,
}: {
  videoPath: string
  title: string
  description: string
  accessToken: string
  refreshToken?: string
}): Promise<{ videoId: string; videoUrl: string }> {
  const oauth2Client = createOAuthClient()
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  // Auto-refresh token if expired
  oauth2Client.on('tokens', (tokens) => {
    // In production you'd save these updated tokens to DB
    console.log('YouTube tokens refreshed')
  })

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

  // Ensure #Shorts is in the title/description for YouTube to classify it
  const shortTitle = title.includes('#Shorts') ? title : `${title} #Shorts`
  const shortDescription = `${description}\n\n#Shorts`

  try {
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: shortTitle.slice(0, 100), // YouTube title max 100 chars
          description: shortDescription.slice(0, 5000),
          categoryId: '22', // People & Blogs
          tags: ['Shorts', 'Short'],
          defaultLanguage: 'en',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body: fs.createReadStream(videoPath),
      },
    })

    const videoId = response.data.id ?? ''
    if (!videoId) {
      throw new Error('YouTube API did not return a video ID.')
    }
    return {
      videoId,
      videoUrl: `https://www.youtube.com/shorts/${videoId}`,
    }
  } catch (err) {
    console.error('[YouTube] Upload failed. Full API error:', JSON.stringify(err, null, 2))
    // Re-throw the error to be caught by the scheduler
    throw err
  }
}
