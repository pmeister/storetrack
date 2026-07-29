import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Kafka, logLevel } from 'kafkajs'

/**
 * Consumes the full storetrack.changes topic and returns the caller's
 * household's events, newest first. The caller must send their Supabase
 * access token; events are filtered to their household server-side.
 *
 * Uses the same Confluent env vars as kafka-webhook.ts. The API key's
 * service account additionally needs:
 *   - Topic storetrack.changes: Read
 *   - Consumer group "storetrack-audit": Read
 */

interface ChangeEvent {
  op: string
  table: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
  at: string
}

const MAX_EVENTS = 300

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.replace(/^Bearer /, '')
  if (!token) return res.status(401).json({ error: 'missing token' })

  const supaUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY!
  const authHeaders = { apikey: anonKey, Authorization: `Bearer ${token}` }

  const userRes = await fetch(`${supaUrl}/auth/v1/user`, { headers: authHeaders })
  if (!userRes.ok) return res.status(401).json({ error: 'invalid token' })
  const user = (await userRes.json()) as { id: string }

  // RLS on profiles scopes this to the caller's own row
  const profileRes = await fetch(
    `${supaUrl}/rest/v1/profiles?select=household_id&id=eq.${user.id}`,
    { headers: authHeaders },
  )
  const profiles = (await profileRes.json()) as { household_id: string | null }[]
  const householdId = profiles[0]?.household_id
  if (!householdId) return res.status(403).json({ error: 'no household' })

  const events = await consumeAll()
  const mine = events
    .filter((e) => {
      const hid =
        (e.record?.household_id as string | undefined) ??
        (e.old_record?.household_id as string | undefined)
      return hid === householdId
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, MAX_EVENTS)

  return res.status(200).json({ events: mine })
}

async function consumeAll(): Promise<ChangeEvent[]> {
  const topic = process.env.KAFKA_TOPIC ?? 'storetrack.changes'
  // Confluent's REST endpoint host doubles as the bootstrap host on :9092
  const bootstrap =
    process.env.CONFLUENT_BOOTSTRAP ??
    `${new URL(process.env.CONFLUENT_REST_ENDPOINT!).hostname}:9092`

  const kafka = new Kafka({
    clientId: 'storetrack-audit',
    brokers: [bootstrap],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: process.env.CONFLUENT_API_KEY!,
      password: process.env.CONFLUENT_API_SECRET!,
    },
    logLevel: logLevel.NOTHING,
  })

  const admin = kafka.admin()
  await admin.connect()
  const offsets = await admin.fetchTopicOffsets(topic)
  await admin.disconnect()

  const total = offsets.reduce(
    (sum, o) => sum + (Number(o.offset) - Number(o.low)),
    0,
  )
  if (total === 0) return []

  const consumer = kafka.consumer({ groupId: 'storetrack-audit' })
  await consumer.connect()
  await consumer.subscribe({ topic, fromBeginning: true })

  const events: ChangeEvent[] = []
  await new Promise<void>((resolve) => {
    const deadline = setTimeout(resolve, 8000)
    consumer.run({
      autoCommit: false, // always re-read from the beginning next time
      eachMessage: async ({ message }) => {
        if (message.value) {
          try {
            events.push(JSON.parse(message.value.toString()) as ChangeEvent)
          } catch {
            // ignore malformed messages (e.g. hand-sent test data)
          }
        }
        if (events.length >= total) {
          clearTimeout(deadline)
          resolve()
        }
      },
    })
  })
  await consumer.disconnect()
  return events
}
