'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'

interface Post {
  id: string
  title: string
  platforms: string
  scheduledAt: string
  status: string
}

const platformColors: Record<string, string> = {
  youtube: '#ff0000',
  instagram: '#e1306c',
  tiktok: '#fe2c55',
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/posts')
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts ?? [])
        setLoading(false)
      })
  }, [])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getPostsForDay(day: Date): Post[] {
    return posts.filter((p) => isSameDay(new Date(p.scheduledAt), day))
  }

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : []

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-[#8b949e] mt-1">See your posting schedule at a glance</p>
        </div>
        <Link
          href="/schedule"
          className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Schedule Post
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="w-8 h-8 flex items-center justify-center text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
            >
              ←
            </button>
            <h2 className="text-white font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="w-8 h-8 flex items-center justify-center text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
            >
              →
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#30363d]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="p-3 text-center text-[#6e7681] text-xs font-medium uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayPosts = getPostsForDay(day)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              const selected = selectedDay && isSameDay(day, selectedDay)
              const allPlatforms = dayPosts.flatMap((p) => JSON.parse(p.platforms) as string[])
              const platforms = allPlatforms.filter((v, i) => allPlatforms.indexOf(v) === i)

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  className={`min-h-[80px] p-2 text-left border-b border-r border-[#21262d] transition-colors hover:bg-[#21262d] ${
                    selected ? 'bg-[#7c3aed]/10 border-[#7c3aed]/30' : ''
                  } ${!inMonth ? 'opacity-30' : ''}`}
                >
                  <span
                    className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                      today
                        ? 'bg-[#7c3aed] text-white'
                        : inMonth
                        ? 'text-white'
                        : 'text-[#484f58]'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {dayPosts.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {dayPosts.slice(0, 2).map((post) => {
                        const postPlatforms: string[] = JSON.parse(post.platforms)
                        return (
                          <div
                            key={post.id}
                            className="text-[10px] px-1.5 py-0.5 rounded truncate text-white"
                            style={{ backgroundColor: platformColors[postPlatforms[0]] + '80' }}
                          >
                            {format(new Date(post.scheduledAt), 'h:mma')} {post.title}
                          </div>
                        )
                      })}
                      {dayPosts.length > 2 && (
                        <div className="text-[10px] text-[#6e7681] px-1">+{dayPosts.length - 2} more</div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar: Selected day details */}
        <div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">
              {selectedDay ? format(selectedDay, 'MMMM d, yyyy') : 'Select a day'}
            </h3>

            {!selectedDay ? (
              <p className="text-[#6e7681] text-sm">Click a day on the calendar to see posts scheduled for that day.</p>
            ) : selectedDayPosts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[#6e7681] text-sm mb-3">No posts scheduled</p>
                <Link
                  href={`/schedule`}
                  className="text-[#7c3aed] text-sm hover:text-[#a78bfa] transition-colors"
                >
                  + Schedule for this day
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayPosts.map((post) => {
                  const platforms: string[] = JSON.parse(post.platforms)
                  return (
                    <div key={post.id} className="bg-[#21262d] rounded-xl p-3">
                      <p className="text-white text-sm font-medium">{post.title}</p>
                      <p className="text-[#6e7681] text-xs mt-1">
                        {format(new Date(post.scheduledAt), 'h:mm a')}
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        {platforms.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] px-2 py-0.5 rounded text-white font-medium"
                            style={{ backgroundColor: platformColors[p] }}
                          >
                            {p.slice(0, 2).toUpperCase()}
                          </span>
                        ))}
                        <span
                          className={`ml-auto text-[10px] px-2 py-0.5 rounded font-medium ${
                            post.status === 'pending'
                              ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                              : post.status === 'posted'
                              ? 'bg-[#10b981]/20 text-[#10b981]'
                              : 'bg-[#ef4444]/20 text-[#ef4444]'
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 bg-[#161b22] border border-[#30363d] rounded-xl p-4">
            <p className="text-[#6e7681] text-xs font-medium uppercase tracking-wide mb-3">Platforms</p>
            <div className="space-y-2">
              {Object.entries(platformColors).map(([p, color]) => (
                <div key={p} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[#8b949e] text-xs capitalize">{p === 'youtube' ? 'YouTube Shorts' : p === 'instagram' ? 'Instagram Reels' : 'TikTok'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
