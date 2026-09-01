import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'PostFlow - Social Media Scheduler',
  description: 'Schedule your TikTok, Instagram Reels, and YouTube Shorts in bulk',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen bg-[#0d1117]">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen">
            <div className="p-8 max-w-6xl mx-auto">{children}</div>
          </main>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#21262d',
              color: '#e6edf3',
              border: '1px solid #30363d',
              borderRadius: '8px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
