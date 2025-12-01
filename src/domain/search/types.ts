export type SearchScope = 'chat' | 'inbox' | 'calendar' | 'all'

export type SearchResultType = 'chat_message' | 'inbox_item' | 'calendar_event'

export interface SearchResult {
  id: string
  type: SearchResultType
  scope: SearchScope
  tenantId: string
  title: string
  snippet?: string
  meta?: string
  sessionId?: string
  createdAt?: string
}

export interface SearchRequest {
  tenantId: string
  query: string
  scope: SearchScope
}
