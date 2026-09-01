'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface Post {
  id: string
  title: string
  caption: string
  platforms: string
  scheduledAt: string
  status: string
  videoUrl: string
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

export default function HistoryPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'posted' | 'failed'>('all')

  useEffect(() => {
    fetch('/api/posts')
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts ?? [])
        setLoading(false)
      })
  }, [])

  const historicPosts = posts
    .filter((p) => p.status !== 'pending' && p.status !== 'posting')
    .filter((p) => filter === 'all' || p.status === filter)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  const stats = {
    total: posts.filter((p) => p.status !== 'pending').length,
    posted: posts.filter((p) => p.status === 'posted').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-[#8b949e] mt-1">All your past and processed posts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[#6e7681] text-xs font-medium mb-1">Total Processed</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[#6e7681] text-xs font-medium mb-1">Successfully Published</p>
          <p className="text-3xl font-bold text-[#10b981]">{stats.posted}</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[#6e7681] text-xs font-medium mb-1">Failed</p>
          <p className="text-3xl font-bold text-[#ef4444]">{stats.failed}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 w-fit mb-6">
        {(['all', 'posted', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-[#7c3aed] text-white' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f === 'posted' ? '✅ Published' : '❌ Failed'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : historicPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[#161b22] border border-dashed border-[#30363d] rounded-2xl">
          <div className="text-5xl mb-4">📜</div>
          <h3 className="text-white font-semibold text-lg mb-2">No history yet</h3>
          <p className="text-[#8b949e] text-sm">Posts will appear here once they've been processed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historicPosts.map((post) => {
            const platforms: string[] = JSON.parse(post.platforms)
            const isSuccess = post.status === 'posted'
            return (
              <div
                key={post.id}
                className={`bg-[#161b22] border rounded-xl p-4 ${
                  isSuccess ? 'border-[#10b981]/20' : post.status === 'failed' ? 'border-[#ef4444]/20' : 'border-[#30363d]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{isSuccess ? '✅' : post.status === 'failed' ? '❌' : '🚫'}</span>
                      <p className="text-white font-medium truncate">{post.title}</p>
                    </div>
                    <p className="text-[#6e7681] text-xs">
                      Posted {format(new Date(post.scheduledAt), 'MMM d, yyyy • h:mm a')}
                    </p>

                    {/* Per-platform results */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {platforms.map((p) => {
                        const result = post.results?.find((r) => r.platform === p)
                        const success = result?.status === 'success'
                        return (
                          <div key={p} className="flex items-center gap-1">
                            {result?.platformUrl ? (
                              <a
                                href={result.platformUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-white border transition-colors hover:opacity-80"
                                style={{
                                  backgroundColor: `${platformColors[p]}15`,
                                  borderColor: `${platformColors[p]}40`,
                                  color: platformColors[p],
                                }}
                              >
                                {success ? '✓' : '✗'} {platformLabels[p]} {success ? '→' : ''}
                              </a>
                            ) : (
                              <span
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border"
                                style={{
                                  backgroundColor: `${platformColors[p]}10`,
                                  borderColor: `${platformColors[p]}30`,
                                  color: platformColors[p],
                                }}
                              >
                                {success ? '✓' : '✗'} {platformLabels[p]}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Error details */}
                    {post.results?.some((r) => r.error) && (
                      <div className="mt-2 p-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
                        {post.results.filter((r) => r.error).map((r) => (
                          <p key={r.platform} className="text-[#ef4444] text-xs">
                            {platformLabels[r.platform]}: {r.error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
