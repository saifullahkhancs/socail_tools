'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const PLATFORMS = [
  {
    id: 'youtube',
    label: 'YouTube Shorts',
    icon: '▶',
    color: '#ff0000',
    captionLimit: 5000,
    titleLimit: 100,
    note: 'Video must be ≤60s, vertical (9:16)',
  },
  {
    id: 'instagram',
    label: 'Instagram Reels',
    icon: '📸',
    color: '#e1306c',
    captionLimit: 2200,
    titleLimit: 0,
    note: 'Requires public URL (use ngrok locally)',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '♪',
    color: '#fe2c55',
    captionLimit: 2200,
    titleLimit: 0,
    note: 'Requires Content Posting API approval',
  },
]

export default function SchedulePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube', 'instagram', 'tiktok'])
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [customizePlatforms, setCustomizePlatforms] = useState(false)
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Default to 1 hour from now
  const getDefaultDateTime = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    return {
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
    }
  }

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File too large (max 500MB)')
      return
    }
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    // Auto-fill title from filename
    if (!title) {
      setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
    }
  }, [title])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const uploadVideo = async (): Promise<string> => {
    if (!videoFile) throw new Error('No video file')
    if (uploadedPath) return uploadedPath

    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('video', videoFile)

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
      xhr.onload = () => {
        setUploading(false)
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText)
          setUploadedPath(data.url)
          resolve(data.url)
        } else {
          reject(new Error('Upload failed'))
        }
      }
      xhr.onerror = () => {
        setUploading(false)
        reject(new Error('Upload error'))
      }
      xhr.open('POST', '/api/upload')
      xhr.send(formData)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile) return toast.error('Please select a video')
    if (selectedPlatforms.length === 0) return toast.error('Select at least one platform')
    if (!title.trim()) return toast.error('Title is required')
    if (!scheduleDate || !scheduleTime) return toast.error('Please set a schedule date & time')

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
    if (new Date(scheduledAt) <= new Date()) return toast.error('Schedule time must be in the future')

    setSubmitting(true)
    try {
      const videoUrl = await uploadVideo()

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          caption: caption.trim(),
          hashtags: hashtags.trim(),
          videoUrl,
          videoPath: videoUrl,
          platforms: selectedPlatforms,
          scheduledAt,
          youtubeTitle: customizePlatforms ? (platformCaptions.youtubeTitle ?? '') : '',
          instagramCaption: customizePlatforms ? (platformCaptions.instagram ?? '') : '',
          tiktokCaption: customizePlatforms ? (platformCaptions.tiktok ?? '') : '',
        }),
      })

      if (!res.ok) throw new Error('Failed to schedule post')
      toast.success('🎉 Post scheduled successfully!')
      router.push('/queue')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const { date: defaultDate, time: defaultTime } = getDefaultDateTime()

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Schedule a Post</h1>
        <p className="text-[#8b949e] mt-1">Upload once, post everywhere automatically</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-5 gap-6">
          {/* Left: Video Upload */}
          <div className="col-span-2 space-y-4">
            {/* Upload zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
                dragging
                  ? 'border-[#7c3aed] bg-[#7c3aed]/10'
                  : videoPreview
                  ? 'border-[#30363d] bg-[#161b22]'
                  : 'border-[#30363d] hover:border-[#484f58] bg-[#161b22]'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !videoPreview && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
              />

              {videoPreview ? (
                <div className="relative">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full rounded-xl"
                    style={{ maxHeight: '360px', objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setVideoFile(null)
                      setVideoPreview(null)
                      setUploadedPath(null)
                    }}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#21262d] flex items-center justify-center mb-4 text-3xl">
                    🎬
                  </div>
                  <p className="text-white font-medium mb-1">Drop your video here</p>
                  <p className="text-[#8b949e] text-sm">or click to browse</p>
                  <p className="text-[#484f58] text-xs mt-3">MP4, MOV, WebM · Max 500MB</p>
                  <p className="text-[#484f58] text-xs">Vertical (9:16) recommended for all platforms</p>
                </div>
              )}
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#8b949e]">Uploading video...</span>
                  <span className="text-[#7c3aed] font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#21262d] rounded-full h-2">
                  <div
                    className="bg-[#7c3aed] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video info */}
            {videoFile && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <p className="text-[#6e7681] text-xs font-medium uppercase tracking-wide mb-2">Video Info</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6e7681]">File</span>
                    <span className="text-[#e6edf3] truncate max-w-[180px]">{videoFile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6e7681]">Size</span>
                    <span className="text-[#e6edf3]">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6e7681]">Type</span>
                    <span className="text-[#e6edf3]">{videoFile.type || 'video'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Form */}
          <div className="col-span-3 space-y-5">
            {/* Platform Selection */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <p className="text-white font-medium mb-3">Post to Platforms</p>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((p) => {
                  const selected = selectedPlatforms.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlatforms((prev) =>
                          selected ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                        )
                      }}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                        selected
                          ? 'border-current bg-current/10'
                          : 'border-[#30363d] hover:border-[#484f58] bg-transparent'
                      }`}
                      style={selected ? { borderColor: p.color, color: p.color } : {}}
                    >
                      {selected && (
                        <span className="absolute top-2 right-2 text-xs bg-current rounded-full w-4 h-4 flex items-center justify-center">
                          <span className="text-white text-[10px]">✓</span>
                        </span>
                      )}
                      <span className="text-2xl">{p.icon}</span>
                      <span className={`text-xs font-medium text-center leading-tight ${selected ? '' : 'text-[#8b949e]'}`}>
                        {p.label}
                      </span>
                      <span className="text-[10px] text-[#6e7681] text-center">{p.note}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[#8b949e] text-sm font-medium mb-2">
                Title <span className="text-[#ef4444]">*</span>
                <span className="text-[#484f58] font-normal ml-1">(used as YouTube title)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a catchy title..."
                maxLength={100}
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#7c3aed] text-white placeholder-[#484f58] rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                required
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${title.length > 90 ? 'text-[#f59e0b]' : 'text-[#484f58]'}`}>
                  {title.length}/100
                </span>
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-[#8b949e] text-sm font-medium mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your caption here... (used for all platforms unless customized)"
                rows={4}
                maxLength={2200}
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#7c3aed] text-white placeholder-[#484f58] rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${caption.length > 2000 ? 'text-[#f59e0b]' : 'text-[#484f58]'}`}>
                  {caption.length}/2,200
                </span>
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-[#8b949e] text-sm font-medium mb-2">
                Hashtags
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#viral #fyp #shorts (space or # separated)"
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#7c3aed] text-white placeholder-[#484f58] rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              />
            </div>

            {/* Per-platform customization toggle */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setCustomizePlatforms(!customizePlatforms)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#21262d] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#7c3aed]">✏️</span>
                  <span className="text-white text-sm font-medium">Customize per platform</span>
                  <span className="text-[#484f58] text-xs">(optional)</span>
                </div>
                <span className={`text-[#7c3aed] transition-transform ${customizePlatforms ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {customizePlatforms && (
                <div className="border-t border-[#30363d] p-4 space-y-4">
                  {selectedPlatforms.includes('youtube') && (
                    <div>
                      <label className="block text-[#ff0000] text-xs font-medium mb-1.5">
                        ▶ YouTube Title (overrides main title)
                      </label>
                      <input
                        type="text"
                        value={platformCaptions.youtubeTitle ?? ''}
                        onChange={(e) => setPlatformCaptions((p) => ({ ...p, youtubeTitle: e.target.value }))}
                        placeholder="YouTube-specific title..."
                        maxLength={100}
                        className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#ff0000]/50 text-white placeholder-[#484f58] rounded-lg px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  )}
                  {selectedPlatforms.includes('instagram') && (
                    <div>
                      <label className="block text-[#e1306c] text-xs font-medium mb-1.5">
                        📸 Instagram Caption (overrides main caption)
                      </label>
                      <textarea
                        value={platformCaptions.instagram ?? ''}
                        onChange={(e) => setPlatformCaptions((p) => ({ ...p, instagram: e.target.value }))}
                        placeholder="Instagram-specific caption..."
                        rows={3}
                        maxLength={2200}
                        className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#e1306c]/50 text-white placeholder-[#484f58] rounded-lg px-3 py-2 text-sm outline-none resize-none"
                      />
                    </div>
                  )}
                  {selectedPlatforms.includes('tiktok') && (
                    <div>
                      <label className="block text-[#fe2c55] text-xs font-medium mb-1.5">
                        ♪ TikTok Caption (overrides main caption)
                      </label>
                      <textarea
                        value={platformCaptions.tiktok ?? ''}
                        onChange={(e) => setPlatformCaptions((p) => ({ ...p, tiktok: e.target.value }))}
                        placeholder="TikTok-specific caption..."
                        rows={3}
                        maxLength={2200}
                        className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#fe2c55]/50 text-white placeholder-[#484f58] rounded-lg px-3 py-2 text-sm outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Schedule Date & Time */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <p className="text-white font-medium mb-3">📅 Schedule</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8b949e] text-xs font-medium mb-1.5">Date</label>
                  <input
                    type="date"
                    value={scheduleDate || defaultDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#7c3aed] text-white rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] text-xs font-medium mb-1.5">Time</label>
                  <input
                    type="time"
                    value={scheduleTime || defaultTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#7c3aed] text-white rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              {scheduleDate && scheduleTime && (
                <p className="text-[#7c3aed] text-xs mt-2">
                  ⚡ Will post on {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || uploading || !videoFile || selectedPlatforms.length === 0}
              className="w-full py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:bg-[#30363d] disabled:text-[#6e7681] text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {submitting || uploading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Scheduling...'}
                </>
              ) : (
                <>
                  🚀 Schedule Post to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
