'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⚡' },
  { href: '/schedule', label: 'Schedule Post', icon: '➕' },
  { href: '/queue', label: 'Queue', icon: '📋' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/history', label: 'History', icon: '📜' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center text-white font-bold text-lg shadow-lg">
            P
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">PostFlow</h1>
            <p className="text-[#6e7681] text-xs">Social Scheduler</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#7c3aed] text-white shadow-md'
                  : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
              {item.href === '/queue' && (
                <span className="ml-auto bg-[#30363d] text-[#8b949e] text-xs px-1.5 py-0.5 rounded-full">
                  ·
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Platform status */}
      <div className="p-4 border-t border-[#30363d]">
        <p className="text-[#6e7681] text-xs font-medium uppercase tracking-wide mb-3">
          Platforms
        </p>
        <PlatformStatus />
      </div>

      {/* Bottom */}
      <div className="p-4 border-t border-[#30363d]">
        <p className="text-[#484f58] text-xs text-center">PostFlow v1.0 · Local</p>
      </div>
    </aside>
  )
}

function PlatformStatus() {
  // This fetches connection status from the API
  // We use a simple static render for the sidebar; real status shown in Settings
  return (
    <div className="space-y-2">
      <PlatformDot label="YouTube" color="#ff0000" letter="Y" />
      <PlatformDot label="Instagram" color="#e1306c" letter="I" />
      <PlatformDot label="TikTok" color="#fe2c55" letter="T" />
    </div>
  )
}

function PlatformDot({
  label,
  color,
  letter,
}: {
  label: string
  color: string
  letter: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: color }}
      >
        {letter}
      </div>
      <span className="text-[#8b949e] text-xs">{label}</span>
    </div>
  )
}
