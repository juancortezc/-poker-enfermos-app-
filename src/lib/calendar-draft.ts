import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'

export interface CalendarDraftEntry {
  dateNumber: number
  scheduledDate: string
}

export interface CalendarDraft {
  tournamentNumber?: number | null
  gameDates: CalendarDraftEntry[]
  approved?: boolean
  createdAt?: string
  updatedAt?: string
  updatedBy?: string | null
}

export async function fetchCalendarDraft(): Promise<CalendarDraft | null> {
  if (typeof window === 'undefined') return null
  if (!getStoredAuthToken()) return null

  try {
    const response = await fetch('/api/calendar-draft', {
      headers: buildAuthHeaders()
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const draft = data?.draft

    if (!draft || !Array.isArray(draft.gameDates)) {
      return null
    }

    return draft as CalendarDraft
  } catch (error) {
    console.error('Error fetching calendar draft:', error)
    return null
  }
}

export async function saveCalendarDraft(draft: CalendarDraft): Promise<CalendarDraft | null> {
  if (typeof window === 'undefined') return null
  if (!getStoredAuthToken()) return null

  try {
    const response = await fetch('/api/calendar-draft', {
      method: 'POST',
      headers: buildAuthHeaders({}, { includeJson: true }),
      body: JSON.stringify({
        tournamentNumber: draft.tournamentNumber ?? null,
        gameDates: draft.gameDates,
        approved: draft.approved ?? false
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Error guardando calendario')
    }

    const data = await response.json()
    return data?.draft as CalendarDraft
  } catch (error) {
    console.error('Error saving calendar draft:', error)
    throw error
  }
}

export async function clearCalendarDraft(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!getStoredAuthToken()) return

  try {
    await fetch('/api/calendar-draft', {
      method: 'DELETE',
      headers: buildAuthHeaders()
    })
  } catch (error) {
    console.error('Error clearing calendar draft:', error)
  }
}
