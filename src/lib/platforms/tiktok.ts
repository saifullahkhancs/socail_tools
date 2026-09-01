// TikTok Content Posting API
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
//
// NOTE: TikTok's Content Posting API requires an app review.
// Apply at: https://developers.tiktok.com/

import fs from 'fs'

const TIKTOK_API = 'https://open.tiktokapis.com/v2'

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri:
      process.env.TIKTOK_REDIRECT_URI ||
      'http://localhost:3000/api/platforms/tiktok/callback',
    state: `tiktok_${Date.now()}`,
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`
}

export async function exchangeCode(code: string) {
  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri:
        process.env.TIKTOK_REDIRECT_URI ||
        'http://localhost:3000/api/platforms/tiktok/callback',
    }),
  })
  return res.json()
}

export async function refreshToken(refreshTokenValue: string) {
  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshTokenValue,
    }),
  })
  return res.json()
}

export async function getUserInfo(accessToken: string) {
  const res = await fetch(
    `${TIKTOK_API}/user/info/?fields=open_id,union_id,avatar_url,display_name`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  const data = await res.json()
  return {
    accountId: data.data?.user?.open_id ?? '',
    accountName: data.data?.user?.display_name ?? 'TikTok Account',
  }
}

export async function uploadVideo({
  videoPath,
  caption,
  accessToken,
}: {
  videoPath: string
  caption: string
  accessToken: string
}): Promise<{ publishId: string; videoUrl: string }> {
  const fileSize = fs.statSync(videoPath).size

  // Step 1: Initialize upload
  const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 2200),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: fileSize, // Single chunk for simplicity
        total_chunk_count: 1,
      },
    }),
  })

  const initData = await initRes.json()

  if (initData.error?.code && initData.error.code !== 'ok') {
    console.error('[TikTok] Init failed. Full API error:', JSON.stringify(initData.error, null, 2))
    throw new Error(`TikTok init error: ${initData.error.message}`)
  }

  const { publish_id, upload_url } = initData.data
  if (!publish_id || !upload_url) {
    throw new Error('TikTok did not return upload URL')
  }

  // Step 2: Upload the video file
  const fileBuffer = fs.readFileSync(videoPath)
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
      'Content-Length': String(fileSize),
    },
    body: fileBuffer,
  })

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text()
    console.error('[TikTok] File upload failed. Status:', uploadRes.status, 'Response:', errorText)
    throw new Error(`TikTok upload failed: ${uploadRes.status} ${uploadRes.statusText}`)
  }

  // Step 3: Poll for publish status
  const videoUrl = await pollPublishStatus(publish_id, accessToken)

  return { publishId: publish_id, videoUrl }
}

async function pollPublishStatus(
  publishId: string,
  accessToken: string,
  maxAttempts = 30
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 10000)) // Wait 10s

    const res = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    })
    const data = await res.json()
    const status = data.data?.status

    if (status === 'PUBLISH_COMPLETE') {
      const videoId = data.data?.publicaly_available_post_id?.[0] ?? publishId
      return `https://www.tiktok.com/@me/video/${videoId}`
    }
    if (status === 'FAILED') {
      console.error('[TikTok] Publish failed. Full API error:', JSON.stringify(data.data, null, 2))
      throw new Error(`TikTok publish failed: ${data.data?.fail_reason ?? 'Unknown'}`)
    }
  }
  throw new Error('TikTok publish timed out')
}
