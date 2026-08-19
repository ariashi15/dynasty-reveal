export type Dynasty = 'fire' | 'water' | 'earth' | 'wind'

export type Member = {
  id: string
  created_at: string
  member_name: string
  member_big: string | null
  dynasty: Dynasty
  is_dynasty_head: boolean | null
}

type MembersResponse = {
  members: unknown
}

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not configured.')
  }

  return apiUrl
}

export async function fetchMembers(signal?: AbortSignal): Promise<unknown[]> {
  const response = await fetch(`${getApiUrl()}/api/public/members`, { signal })

  if (!response.ok) {
    throw new Error(`Member request failed with status ${response.status}.`)
  }

  const data = (await response.json()) as MembersResponse
  if (!data || !Array.isArray(data.members)) {
    throw new Error('The member API returned an invalid response.')
  }

  return data.members
}
