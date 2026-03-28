import PusherServer from 'pusher'

// Server-side Pusher instance — lazy initialization to avoid build errors
let pusherInstance: PusherServer | null = null

export function getPusherServer(): PusherServer {
  if (!pusherInstance) {
    pusherInstance = new PusherServer({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      useTLS: true,
    })
  }
  return pusherInstance
}

// Trigger an event on a PR channel
export async function triggerPREvent(
  pullRequestId: string,
  event: string,
  data: Record<string, any>
) {
  try {
    const pusher = getPusherServer()
    await pusher.trigger(`pr-${pullRequestId}`, event, data)
  } catch (error) {
    console.error('Pusher trigger error:', error)
  }
}
