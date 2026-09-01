import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('video') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 })
    }

    // 500MB limit
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 500MB)' }, { status: 400 })
    }

    // Create uploads directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // Sanitize filename and make unique
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${Date.now()}_${sanitized}`
    const filepath = path.join(uploadDir, filename)

    // Write to disk
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    const url = `/uploads/${filename}`
    return NextResponse.json({
      url,
      filename,
      size: file.size,
      type: file.type,
    })
  } catch (err: unknown) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// Allow large uploads - disable body size limit
export const maxDuration = 300 // 5 minutes timeout
