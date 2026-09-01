// This file runs once when Next.js server starts
// Perfect for initializing the background scheduler

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initScheduler } = await import('./lib/scheduler')
    initScheduler()
  }
}
