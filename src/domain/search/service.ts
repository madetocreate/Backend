import { db } from '../../infra/db'
import type { SearchRequest, SearchResult, SearchScope } from './types'

const SEARCH_LIMIT = 20

function toLikePattern(query: string) {
  return '%' + query.toLowerCase() + '%'
}

function buildSnippet(content: string, query: string, maxLength = 160): string {
  const text = content.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }
  const start = Math.max(0, idx - Math.floor(maxLength / 2))
  const end = Math.min(text.length, start + maxLength)
  let snippet = text.slice(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'
  return snippet
}

function buildTitleFromContent(content: string, fallback: string): string {
  const line = content.split('\n')[0].trim()
  if (!line) return fallback
  return line.length > 60 ? line.slice(0, 57) + '...' : line
}

export async function searchChats(req: SearchRequest): Promise<SearchResult[]> {
  const pattern = toLikePattern(req.query)
  const rows = db
    .prepare(
      "select id, conversation_id, content, created_at " +
        "from memory_records " +
        "where tenant_id = @tenantId " +
        "and type = 'conversation_message' " +
        "and lower(content) like @pattern " +
        "order by created_at desc " +
        "limit @limit"
    )
    .all({
      tenantId: req.tenantId,
      pattern,
      limit: SEARCH_LIMIT
    }) as {
      id: string | number
      conversation_id?: string
      content?: string
      created_at?: string
    }[]

  return rows.map((row) => {
    const content = String(row.content ?? '')
    return {
      id: String(row.id),
      type: 'chat_message',
      scope: 'chat',
      tenantId: req.tenantId,
      title: buildTitleFromContent(content, 'Chat'),
      snippet: buildSnippet(content, req.query),
      sessionId: row.conversation_id ? String(row.conversation_id) : undefined,
      createdAt: row.created_at
    }
  })
}

export async function searchInbox(req: SearchRequest): Promise<SearchResult[]> {
  const pattern = toLikePattern(req.query)
  const rows = db
    .prepare(
      "select id, type, content, created_at " +
        "from memory_records " +
        "where tenant_id = @tenantId " +
        "and type in ('email','dm','review') " +
        "and lower(content) like @pattern " +
        "order by created_at desc " +
        "limit @limit"
    )
    .all({
      tenantId: req.tenantId,
      pattern,
      limit: SEARCH_LIMIT
    }) as {
      id: string | number
      type?: string
      content?: string
      created_at?: string
    }[]

  return rows.map((row) => {
    const content = String(row.content ?? '')
    let meta: string | undefined
    if (row.type === 'email') meta = 'E Mail'
    else if (row.type === 'dm') meta = 'Direktnachricht'
    else if (row.type === 'review') meta = 'Bewertung'
    return {
      id: String(row.id),
      type: 'inbox_item',
      scope: 'inbox',
      tenantId: req.tenantId,
      title: buildTitleFromContent(content, 'Nachricht'),
      snippet: buildSnippet(content, req.query),
      meta,
      createdAt: row.created_at
    }
  })
}

export async function searchCalendar(req: SearchRequest): Promise<SearchResult[]> {
  return []
}

export async function search(req: SearchRequest): Promise<SearchResult[]> {
  const scopes: SearchScope[] = req.scope === 'all' ? ['chat', 'inbox', 'calendar'] : [req.scope]
  const results: SearchResult[] = []
  for (const scope of scopes) {
    if (scope === 'chat') {
      results.push(...(await searchChats(req)))
    } else if (scope === 'inbox') {
      results.push(...(await searchInbox(req)))
    } else if (scope === 'calendar') {
      results.push(...(await searchCalendar(req)))
    }
  }
  results.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0
    return a.createdAt < b.createdAt ? 1 : -1
  })
  return results
}
