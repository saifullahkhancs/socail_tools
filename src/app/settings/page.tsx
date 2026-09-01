'use client'
import { useEffect, useState, Suspense } from 'react'
import toast from 'react-hot-toast'
import ToastHandler from './ToastHandler'

interface Connection {
  platform: string
  connected: boolean
  accountName?: string
  accountId?: string
}

const PLATFORM_INFO = {
  youtube: {
    label: 'YouTube Shorts',
    color: '#ff0000',
    icon: '▶',
    bgColor: 'bg-[#ff0000]',
    description: 'Upload vertical short videos (≤60s) directly to YouTube Shorts',
    features: ['Direct file upload', 'Auto #Shorts tag', 'Auto channel detection'],
    setupSteps: [
      'Go to console.cloud.google.com',
      'Create project → Enable "YouTube Data API v3"',
      'Create OAuth 2.0 credentials (Web Application)',
      'Add http://localhost:3000/api/platforms/youtube/callback as redirect URI',
      'Copy Client ID & Secret to your .env file',
    ],
    envVars: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
  },
  instagram: {
    label: 'Instagram Reels',
    color: '#e1306c',
    icon: '📸',
    bgColor: 'btn-instagram',
    description: 'Publish Reels to your Instagram Business or Creator account',
    features: ['Instagram Business/Creator required', 'Linked to Facebook Page', 'ngrok needed locally'],
    setupSteps: [
      'Go to developers.facebook.com → Create App (Business)',
      'Add Instagram Graph API product',
      'Add http://localhost:3000/api/platforms/instagram/callback as redirect URI',
      'Copy App ID & Secret to your .env file',
      'For video URLs: run ngrok http 3000 and set NEXT_PUBLIC_APP_URL to your ngrok URL',
    ],
    envVars: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
  },
  tiktok: {
    label: 'TikTok',
    color: '#fe2c55',
    icon: '♪',
    bgColor: 'bg-[#fe2c55]',
    description: 'Post videos directly to TikTok using the Content Posting API',
    features: ['Direct file upload', 'Requires API approval from TikTok', 'Creator/Business accounts'],
    setupSteps: [
      'Go to developers.tiktok.com → Create App',
      'Request "Content Posting API" access (requires review by TikTok)',
      'Add http://localhost:3000/api/platforms/tiktok/callback as redirect URI',
      'Copy Client Key & Secret to your .env file',
    ],
    envVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
  },
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null)

  useEffect(() => {
    fetchConnections()
  }, [])

  async function fetchConnections() {
    const res = await fetch('/api/platforms/status')
    const data = await res.json()
    setConnections(data.connections ?? [])
    setLoading(false)
  }

  async function disconnect(platform: string) {
    if (!confirm(`Disconnect ${PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO].label}?`)) return
    const res = await fetch(`/api/platforms/${platform}/disconnect`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Platform disconnected')
      fetchConnections()
    }
  }

  function connect(platform: string) {
    window.location.href = `/api/platforms/${platform}/auth`
  }

  const getConnection = (platform: string): Connection | undefined =>
    connections.find((c) => c.platform === platform)

  return (
    <div className="animate-fade-in">
      <Suspense fallback={null}>
        <ToastHandler />
      </Suspense>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#8b949e] mt-1">Connect your social media accounts to start posting</p>
      </div>

      {/* Platform cards */}
      <div className="space-y-4 mb-10">
        {Object.entries(PLATFORM_INFO).map(([key, info]) => {
          const conn = getConnection(key)
          const isConnected = conn?.connected ?? false

          return (
            <div key={key} className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Platform icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                      style={{ backgroundColor: info.color }}
                    >
                      {info.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-lg">{info.label}</h3>
                        {isConnected && (
                          <span className="flex items-center gap-1 bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-[#8b949e] text-sm mt-1">{info.description}</p>
                      {isConnected && conn?.accountName && (
                        <p className="text-[#6e7681] text-xs mt-1">
                          Account: <span className="text-white">{conn.accountName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Connect/Disconnect button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isConnected ? (
                      <button
                        onClick={() => disconnect(key)}
                        className="px-4 py-2 bg-[#21262d] hover:bg-[#ef4444]/10 hover:text-[#ef4444] text-[#8b949e] hover:border-[#ef4444]/30 border border-[#30363d] rounded-lg text-sm font-medium transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connect(key)}
                        disabled={loading}
                        className="px-5 py-2 text-white rounded-lg text-sm font-medium transition-all hover:opacity-90 shadow-md disabled:opacity-50"
                        style={{ backgroundColor: info.color }}
                      >
                        Connect {info.label}
                      </button>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {info.features.map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2.5 py-1 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Setup instructions (expandable) */}
              <div className="border-t border-[#30363d]">
                <button
                  onClick={() => setExpandedSetup(expandedSetup === key ? null : key)}
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-[#21262d] transition-colors text-sm"
                >
                  <span className="text-[#8b949e]">
                    {isConnected ? '✅ Connected successfully' : '📋 How to set up ' + info.label}
                  </span>
                  <span className="text-[#484f58]">{expandedSetup === key ? '▲' : '▼'}</span>
                </button>

                {expandedSetup === key && (
                  <div className="px-6 pb-5 space-y-4">
                    {/* Required env vars */}
                    <div>
                      <p className="text-[#6e7681] text-xs font-medium uppercase tracking-wide mb-2">
                        Required in .env file:
                      </p>
                      <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-xs space-y-1">
                        {info.envVars.map((v) => (
                          <p key={v} className="text-[#10b981]">
                            {v}=<span className="text-[#f59e0b]">"your_value_here"</span>
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Setup steps */}
                    <div>
                      <p className="text-[#6e7681] text-xs font-medium uppercase tracking-wide mb-2">
                        Setup steps:
                      </p>
                      <ol className="space-y-2">
                        {info.setupSteps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span
                              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: info.color }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-[#8b949e]">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* App Settings */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">App Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#21262d]">
            <div>
              <p className="text-white text-sm font-medium">App URL</p>
              <p className="text-[#6e7681] text-xs mt-0.5">
                Used for Instagram video URLs. Change when using ngrok.
              </p>
            </div>
            <code className="text-[#7c3aed] text-xs bg-[#7c3aed]/10 px-2 py-1 rounded">
              {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
            </code>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#21262d]">
            <div>
              <p className="text-white text-sm font-medium">Scheduler</p>
              <p className="text-[#6e7681] text-xs mt-0.5">
                Automatically checks for due posts every minute
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-[#10b981] text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              Running
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-white text-sm font-medium">Database</p>
              <p className="text-[#6e7681] text-xs mt-0.5">
                Local SQLite database — all data stays on your machine
              </p>
            </div>
            <span className="text-[#8b949e] text-xs">SQLite (local)</span>
          </div>
        </div>
      </div>

      {/* ngrok tip */}
      <div className="mt-4 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-xl shrink-0">💡</span>
          <div>
            <p className="text-[#f59e0b] font-medium text-sm">Instagram tip: ngrok required for local use</p>
            <p className="text-[#8b949e] text-sm mt-1">
              Instagram needs a public URL to fetch your videos. Install ngrok and run:
            </p>
            <code className="block mt-2 bg-[#0d1117] text-[#10b981] text-xs p-3 rounded-lg font-mono">
              ngrok http 3000
            </code>
            <p className="text-[#6e7681] text-xs mt-2">
              Then update NEXT_PUBLIC_APP_URL in your .env to your ngrok URL and restart the app.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
