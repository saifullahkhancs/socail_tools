import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import fs from 'fs'

type GoogleApiError = {
  message?: string
  code?: number | string
  response?: {
    status?: number
    statusText?: string
    data?: {
      error?: {
        code?: number
        message?: string
        status?: string
        errors?: Array<{ reason?: string; message?: string; domain?: string }>
      }
    }
  }
}

function isGoogleApiError(error: unknown): error is GoogleApiError {
  return typeof error === 'object' && error !== null
}

function uploadRecoveryHint(status?: number, reason?: string): string {
  if (reason === 'youtubeSignupRequired') return 'Create a YouTube channel for the connected Google account, then reconnect it.'
  if (reason === 'uploadLimitExceeded') return 'The channel has reached its daily upload limit. Try again later or increase the channel upload limit.'
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') return 'The Google Cloud project has exhausted its YouTube API quota. Check Google Cloud quotas.'
  if (status === 401 || reason === 'authError' || reason === 'invalidCredentials') return 'Reconnect YouTube to grant a fresh upload token.'
  if (status === 403) return 'Confirm YouTube Data API v3 is enabled, this account owns a YouTube channel, and it granted the youtube.upload scope. Reconnect after changing scopes.'
  if (status === 400) return 'Check the video file and metadata. The error reason below identifies the rejected field.'
  return 'Review the HTTP status and reason below, then retry after correcting the reported issue.'
}

/** A safe, actionable summary for the job history; it never includes OAuth tokens or headers. */
export function describeYouTubeUploadError(error: unknown): string {
  if (!isGoogleApiError(error)) return `YouTube upload failed: ${String(error)}`

  const apiError = error.response?.data?.error
  const detail = apiError?.errors?.[0]
  const status = error.response?.status ?? (typeof error.code === 'number' ? error.code : undefined)
  const reason = detail?.reason ?? apiError?.status
  const message = detail?.message ?? apiError?.message ?? error.message ?? 'Unknown error'
  const parts = [
    'YouTube upload failed',
    status ? `HTTP ${status}` : '',
    reason ? `reason=${reason}` : '',
    `message=${message}`,
    `Action: ${uploadRecoveryHint(status, reason)}`,
  ].filter(Boolean)

  return parts.join(' | ')
}

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
  onTokens,
}: {
  videoPath: string
  title: string
  description: string
  accessToken: string
  refreshToken?: string
  onTokens?: (tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }) => void
}): Promise<{ videoId: string; videoUrl: string }> {
  const oauth2Client = createOAuthClient()
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  if (!fs.existsSync(videoPath)) {
    throw new Error(`YouTube upload failed: video file does not exist at ${videoPath}`)
  }
  const fileSize = fs.statSync(videoPath).size
  if (fileSize === 0) {
    throw new Error(`YouTube upload failed: video file is empty at ${videoPath}`)
  }

  // Auto-refresh token if expired. The caller persists new credentials so later jobs do not use a stale token.
  oauth2Client.on('tokens', (tokens) => {
    console.log('[YouTube] OAuth token refreshed during upload', {
      hasAccessToken: Boolean(tokens.access_token),
      hasRefreshToken: Boolean(tokens.refresh_token),
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    })
    onTokens?.(tokens)
  })

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

  // Ensure #Shorts is in the title/description for YouTube to classify it
  const shortTitle = title.includes('#Shorts') ? title : `${title} #Shorts`
  const shortDescription = `${description}\n\n#Shorts`

  try {
    console.log('[YouTube] Starting upload', {
      videoPath,
      fileSizeBytes: fileSize,
      titleLength: shortTitle.length,
      descriptionLength: shortDescription.length,
      requestedPrivacy: 'public',
      hasRefreshToken: Boolean(refreshToken),
    })
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
    const actualPrivacy = response.data.status?.privacyStatus
    console.log('[YouTube] Upload accepted', {
      videoId,
      uploadStatus: response.data.status?.uploadStatus,
      requestedPrivacy: 'public',
      actualPrivacy,
    })
    if (actualPrivacy && actualPrivacy !== 'public') {
      console.warn(
        '[YouTube] The upload was accepted but is not public. New or unaudited YouTube API projects are commonly forced to private uploads; check the project API audit status.'
      )
    }
    return {
      videoId,
      videoUrl: `https://www.youtube.com/shorts/${videoId}`,
    }
  } catch (err) {
    const summary = describeYouTubeUploadError(err)
    console.error('[YouTube] Upload failed', {
      summary,
      status: isGoogleApiError(err) ? err.response?.status : undefined,
      googleError: isGoogleApiError(err) ? err.response?.data?.error : undefined,
    })
    throw new Error(summary, { cause: err })
  }
}
