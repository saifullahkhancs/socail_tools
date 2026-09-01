'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import toast from 'react-hot-toast'

interface Post {
  id: string
  title: string
  caption: string
  platforms: string
  scheduledAt: string
  status: string
  videoUrl: string
  hashtags: string
  results: Array<{ platform: string; status: string; platformUrl: string; error: string }>
}

const platformColors: Record<string, string> = {
  youtube: '#ff0000',
  instagram: '#e1306c',
  tiktok: '#fe2c55',
}

const platformLabels: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

function groupByDay(posts: Post[]): Record<string, Post[]> {
  return posts.reduce((acc, post) => {
    const day = format(new Date(post.scheduledAt), 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = []
    acc[day].push(post)
    return acc
  }, {} as Record<string, Post[]>)
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEEE, MMMM d')
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: 'bg-[#f59e0b]/10 border border-[#f59e0b]/30', text: 'text-[#f59e0b]', label: '⏳ Scheduled' },
    posting: { bg: 'bg-[#6366f1]/10 border border-[#6366f1]/30', text: 'text-[#6366f1]', label: '📤 Posting...' },
    posted: { bg: 'bg-[#10b981]/10 border border-[#10b981]/30', text: 'text-[#10b981]', label: '✅ Published' },
    failed: { bg: 'bg-[#ef4444]/10 border border-[#ef4444]/30', text: 'text-[#ef4444]', label: '❌ Failed' },
    cancelled: { bg: 'bg-[#6e7681]/10 border border-[#6e7681]/30', text: 'text-[#6e7681]', label: '🚫 Cancelled' },
  }[status] ?? { bg: 'bg-[#21262d]', text: 'text-[#8b949e]', label: status }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

export default function QueuePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    fetchPosts()
    const interval = setInterval(fetchPosts, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchPosts() {
    const res = await fetch('/api/posts')
    const data = await res.json()
    setPosts(data.posts ?? [])
    setLoading(false)
  }

  async function cancelPost(id: string) {
    if (!confirm('Cancel this scheduled post?')) return
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    if (res.ok) {
      toast.success('Post cancelled')
      fetchPosts()
    }
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post permanently?')) return
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Post deleted')
      fetchPosts()
    }
  }

  const filteredPosts = posts
    .filter((p) => filter === 'all' || p.status === 'pending' || p.status === 'posting')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const grouped = groupByDay(filteredPosts)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Queue</h1>
          <p className="text-[#8b949e] mt-1">
            {posts.filter((p) => p.status === 'pending').length} post
            {posts.filter((p) => p.status === 'pending').length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'pending' ? 'bg-[#7c3aed] text-white' : 'text-[#8b949e] hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-[#7c3aed] text-white' : 'text-[#8b949e] hover:text-white'
              }`}
            >
              All
            </button>
          </div>
          <Link
            href="/schedule"
            className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-sm font-medium transition-colors"
          >
            + New Post
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[#161b22] border border-dashed border-[#30363d] rounded-2xl">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-white font-semibold text-lg mb-2">Your queue is empty</h3>
          <p className="text-[#8b949e] text-sm mb-6">Schedule your first post to get started</p>
          <Link
            href="/schedule"
            className="px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-medium transition-colors"
          >
            Schedule a Post
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, dayPosts]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-[#8b949e] text-sm font-semibold">{getDayLabel(day)}</h2>
                <div className="flex-1 h-px bg-[#21262d]" />
                <span className="text-[#484f58] text-xs">{dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
                {dayPosts.map((post) => (
                  <PostRow key={post.id} post={post} onCancel={cancelPost} onDelete={deletePost} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PostRow({
  post,
  onCancel,
  onDelete,
}: {
  post: Post
  onCancel: (id: string) => void
  onDelete: (id: string) => void
}) {
  const platforms: string[] = JSON.parse(post.platforms)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[#161b22] border border-[#30363d] hover:border-[#484f58] rounded-xl transition-colors">
      <div className="p-4 flex items-start gap-4">
        {/* Time */}
        <div className="text-center min-w-[56px]">
          <p className="text-white font-semibold text-sm">{format(new Date(post.scheduledAt), 'h:mm')}</p>
          <p className="text-[#6e7681] text-xs">{format(new Date(post.scheduledAt), 'a')}</p>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-[#30363d]" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{post.title}</p>
              {post.caption && (
                <p className="text-[#6e7681] text-sm mt-1 line-clamp-2">{post.caption}</p>
              )}
            </div>
            <StatusBadge status={post.status} />
          </div>

          {/* Platform badges */}
          <div className="flex items-center gap-2 mt-3">
            {platforms.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-white font-medium"
                style={{ backgroundColor: `${platformColors[p]}20`, color: platformColors[p], border: `1px solid ${platformColors[p]}40` }}
              >
                {platformLabels[p]}
                {/* Show per-platform status if posted */}
                {post.results?.find((r) => r.platform === p) && (
                  <span>{post.results.find((r) => r.platform === p)?.status === 'success' ? ' ✓' : ' ✗'}</span>
                )}
              </span>
            ))}
            {post.hashtags && (
              <span className="text-[#484f58] text-xs truncate max-w-[200px]">{post.hashtags}</span>
            )}
          </div>

          {/* Failed error messages */}
          {post.status === 'failed' && post.results?.some((r) => r.error) && (
            <div className="mt-2 p-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
              {post.results.filter((r) => r.error).map((r) => (
                <p key={r.platform} className="text-[#ef4444] text-xs">
                  {platformLabels[r.platform]}: {r.error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {post.status === 'pending' && (
            <button
              onClick={() => onCancel(post.id)}
              className="px-3 py-1.5 text-[#8b949e] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onDelete(post.id)}
            className="px-3 py-1.5 text-[#8b949e] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg text-xs transition-colors"
          >
            Delete
          </button>
          {post.results?.some((r) => r.platformUrl) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1.5 text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-lg text-xs transition-colors"
            >
              Links {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded: platform links */}
      {expanded && post.results?.some((r) => r.platformUrl) && (
        <div className="border-t border-[#30363d] px-4 pb-4 pt-3 flex gap-3">
          {post.results.filter((r) => r.platformUrl).map((r) => (
            <a
              key={r.platform}
              href={r.platformUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg text-white transition-colors"
              style={{ backgroundColor: platformColors[r.platform] }}
            >
              View on {platformLabels[r.platform]} →
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
