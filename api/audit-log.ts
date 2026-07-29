import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Kafka, logLevel } from 'kafkajs'

/**
 * Drains new messages from storetrack.changes into the activity_events
 * table, then reports how many landed. The app reads activity_events
 * directly (RLS-scoped), so the Activity screen never waits on Kafka.
 *
 * The consumer group keeps its own committed offsets, so each run only
 * fetches what arrived since last time — usually nothing, which returns in
 * milliseconds without opening a consumer at all.
 *
 * Env: the CONFLUENT_* vars, plus SUPABASE_SERVICE_ROLE_KEY (server-side
 * only — never VITE_-prefixed). The service role is required because one
 * drain writes events for every household in the topic, not just the
 * caller's, and because the log must not be writable from the app.
 */

const GROUP_ID = 'storetrack-audit'
const DRAIN_MS = 8000

interface EventRow {
  household_id: string
  op: string
  table_name: string
  record: unknown
  old_record: unknown
  at: string
  kafka_partition: number
  kafka_offset: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.replace(/^Bearer /, '')
  if (!token) return res.status(401).json({ error: 'missing token' })

  const supaUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set' })
  }

  const userRes = await fetch(`${supaUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) return res.status(401).json({ error: 'invalid token' })

  try {
    const drained = await drain(supaUrl!, serviceKey)
    return res.status(200).json({ drained })
  } catch (err) {
    return res
      .status(502)
      .json({ error: 'drain failed', detail: err instanceof Error ? err.message : String(err) })
  }
}

async function drain(supaUrl: string, serviceKey: string): Promise<number> {
  const topic = process.env.KAFKA_TOPIC ?? 'storetrack.changes'
  const bootstrap =
    process.env.CONFLUENT_BOOTSTRAP ??
    `${new URL(process.env.CONFLUENT_REST_ENDPOINT!).hostname}:9092`

  const kafka = new Kafka({
    clientId: GROUP_ID,
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
  const [watermarks, committed] = await Promise.all([
    admin.fetchTopicOffsets(topic),
    admin.fetchOffsets({ groupId: GROUP_ID, topics: [topic] }),
  ])
  await admin.disconnect()

  const committedByPartition = new Map<number, string>()
  for (const entry of committed) {
    for (const p of entry.partitions) committedByPartition.set(p.partition, p.offset)
  }

  let pending = 0
  for (const w of watermarks) {
    const mark = committedByPartition.get(w.partition)
    // '-1' means this group has never committed, so start from the low mark
    const from = !mark || mark === '-1' ? BigInt(w.low) : BigInt(mark)
    const high = BigInt(w.offset)
    if (high > from) pending += Number(high - from)
  }
  if (pending === 0) return 0

  const consumer = kafka.consumer({ groupId: GROUP_ID })
  await consumer.connect()
  await consumer.subscribe({ topic, fromBeginning: true })

  const rows: EventRow[] = []
  const lastOffset = new Map<number, bigint>()
  let seen = 0

  await new Promise<void>((resolve) => {
    const deadline = setTimeout(resolve, DRAIN_MS)
    consumer
      .run({
        autoCommit: false, // commit only after the rows are safely stored
        eachMessage: async ({ partition, message }) => {
          seen++
          const row = toRow(partition, message.offset, message.value)
          if (row) rows.push(row)
          const offset = BigInt(message.offset)
          if ((lastOffset.get(partition) ?? -1n) < offset) lastOffset.set(partition, offset)
          if (seen >= pending) {
            clearTimeout(deadline)
            resolve()
          }
        },
      })
      .catch(() => resolve())
  })

  if (rows.length > 0) await storeRows(supaUrl, serviceKey, rows)

  if (lastOffset.size > 0) {
    await consumer.commitOffsets(
      [...lastOffset].map(([partition, offset]) => ({
        topic,
        partition,
        offset: (offset + 1n).toString(),
      })),
    )
  }
  await consumer.disconnect()
  return rows.length
}

function toRow(partition: number, offset: string, value: Buffer | null): EventRow | null {
  if (!value) return null
  let parsed: {
    op?: string
    table?: string
    record?: Record<string, unknown> | null
    old_record?: Record<string, unknown> | null
    at?: string
  }
  try {
    parsed = JSON.parse(value.toString())
  } catch {
    return null // hand-sent or malformed message
  }
  const household =
    (parsed.record?.household_id as string | undefined) ??
    (parsed.old_record?.household_id as string | undefined)
  if (!parsed.op || !parsed.table || !household) return null
  return {
    household_id: household,
    op: parsed.op,
    table_name: parsed.table,
    record: parsed.record ?? null,
    old_record: parsed.old_record ?? null,
    at: parsed.at ?? new Date().toISOString(),
    kafka_partition: partition,
    kafka_offset: offset,
  }
}

async function storeRows(supaUrl: string, serviceKey: string, rows: EventRow[]) {
  const res = await fetch(
    `${supaUrl}/rest/v1/activity_events?on_conflict=kafka_partition,kafka_offset`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        // replayed offsets collide on the unique index and are skipped
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    },
  )
  if (!res.ok) throw new Error(`storing events failed: ${await res.text()}`)
}
