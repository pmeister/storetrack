import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Receives Supabase database webhooks and produces each change event to a
 * Confluent Cloud topic via the Kafka REST API (v3).
 *
 * Required env vars (server-side only, never VITE_-prefixed):
 *   CONFLUENT_REST_ENDPOINT  e.g. https://pkc-xxxxx.us-west4.gcp.confluent.cloud:443
 *   CONFLUENT_CLUSTER_ID     e.g. lkc-xxxxxx
 *   CONFLUENT_API_KEY / CONFLUENT_API_SECRET   cluster-scoped API key
 *   WEBHOOK_SECRET           shared secret the Supabase trigger sends
 * Optional:
 *   KAFKA_TOPIC              defaults to storetrack.changes
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  if (
    !process.env.WEBHOOK_SECRET ||
    req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET
  ) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { type, table, record, old_record } = req.body ?? {}
  if (!type || !table) {
    return res.status(400).json({ error: 'not a supabase webhook payload' })
  }

  const topic = process.env.KAFKA_TOPIC ?? 'storetrack.changes'
  const url = `${process.env.CONFLUENT_REST_ENDPOINT}/kafka/v3/clusters/${process.env.CONFLUENT_CLUSTER_ID}/topics/${topic}/records`
  const auth = Buffer.from(
    `${process.env.CONFLUENT_API_KEY}:${process.env.CONFLUENT_API_SECRET}`,
  ).toString('base64')

  const row = record ?? old_record
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      // key by table + row id so all events for one row stay ordered
      key: { type: 'JSON', data: `${table}:${row?.id ?? 'unknown'}` },
      value: {
        type: 'JSON',
        data: {
          op: type,
          table,
          record: record ?? null,
          old_record: old_record ?? null,
          at: new Date().toISOString(),
        },
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    return res.status(502).json({ error: 'kafka produce failed', detail })
  }
  return res.status(200).json({ ok: true })
}
