// Instagram Graph API - Reels Publishing
// Docs: https://developers.facebook.com/docs/instagram-api/guides/reels-publishing
//
// IMPORTANT: Instagram requires videos to be at a PUBLICLY ACCESSIBLE URL.
// When running locally, use ngrok: `ngrok http 3000`
// Then set NEXT_PUBLIC_APP_URL to your ngrok URL in .env

const GRAPH_API = 'https://graph.facebook.com/v18.0'

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri:
      process.env.INSTAGRAM_REDIRECT_URI ||
      'http://localhost:3000/api/platforms/instagram/callback',
    scope: [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
    ].join(','),
    response_type: 'code',
    state: 'instagram_auth',
  })
  return `https://www.facebook.com/v18.0/dialog/oauth?${params}`
}

export async function exchangeCode(code: string) {
  const res = await fetch(`${GRAPH_API}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      redirect_uri:
        process.env.INSTAGRAM_REDIRECT_URI ||
        'http://localhost:3000/api/platforms/instagram/callback',
      code,
    }),
  })
  return res.json()
}

export async function getLongLivedToken(shortToken: string) {
  const res = await fetch(
    `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET}&fb_exchange_token=${shortToken}`
  )
  return res.json()
}

export async function getInstagramAccountInfo(accessToken: string): Promise<{
  accountId: string
  accountName: string
  pageId: string
}> {
  // Get Facebook pages
  const pagesRes = await fetch(`${GRAPH_API}/me/accounts?access_token=${accessToken}`)
  const pagesData = await pagesRes.json()
  const page = pagesData.data?.[0]
  if (!page) throw new Error('No Facebook Page found. You need a Facebook Page linked to your Instagram Business account.')

  // Get Instagram account linked to the page
  const igRes = await fetch(
    `${GRAPH_API}/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
  )
  const igData = await igRes.json()
  const igAccountId = igData.instagram_business_account?.id
  if (!igAccountId) throw new Error('No Instagram Business/Creator account linked to your Facebook Page.')

  // Get account name
  const nameRes = await fetch(
    `${GRAPH_API}/${igAccountId}?fields=username&access_token=${accessToken}`
  )
  const nameData = await nameRes.json()

  return {
    accountId: igAccountId,
    accountName: nameData.username ?? 'Instagram Account',
    pageId: page.id,
  }
}

export async function publishReel({
  igUserId,
  videoUrl,
  caption,
  accessToken,
}: {
  igUserId: string
  videoUrl: string // Must be a publicly accessible URL!
  caption: string
  accessToken: string
}): Promise<{ mediaId: string; postUrl: string }> {
  // Step 1: Create media container
  const containerRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption.slice(0, 2200),
      share_to_feed: true,
      access_token: accessToken,
    }),
  })
  const containerData = await containerRes.json()

  if (containerData.error) {
    console.error('[Instagram] Container creation failed. Full API error:', JSON.stringify(containerData.error, null, 2))
    throw new Error(`Instagram container error: ${containerData.error.message}`)
  }

  const creationId = containerData.id
  if (!creationId) throw new Error('Failed to create Instagram media container')

  // Step 2: Wait for video processing (poll status)
  await waitForProcessing(igUserId, creationId, accessToken)

  // Step 3: Publish the container
  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  })
  const publishData = await publishRes.json()

  if (publishData.error) {
    console.error('[Instagram] Publish failed. Full API error:', JSON.stringify(publishData.error, null, 2))
    throw new Error(`Instagram publish error: ${publishData.error.message}`)
  }

  const mediaId = publishData.id ?? ''
  return {
    mediaId,
    postUrl: `https://www.instagram.com/reel/${mediaId}/`,
  }
}

async function waitForProcessing(
  igUserId: string,
  creationId: string,
  accessToken: string,
  maxAttempts = 20
) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${GRAPH_API}/${creationId}?fields=status_code,status&access_token=${accessToken}`
    )
    const data = await res.json()

    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') {
      throw new Error(`Instagram video processing failed: ${data.status}`)
    }

    // Wait 15 seconds between polls
    await new Promise((r) => setTimeout(r, 15000))
  }
  throw new Error('Instagram video processing timed out')
}
