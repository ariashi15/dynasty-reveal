import type { Dynasty, Member } from '../api/members'

export type UserNode = {
  name: string
  dynasty: Dynasty
  littles: string[]
  head?: boolean
}

export type TreeData = {
  users: Record<string, UserNode>
  warnings: string[]
}

const DYNASTIES = new Set<Dynasty>(['fire', 'water', 'earth', 'wind'])

const normalizeName = (value: string) => value.trim().toLocaleLowerCase()

const parseMember = (value: unknown): Member | null => {
  if (!value || typeof value !== 'object') return null

  const row = value as Record<string, unknown>
  const id = typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id).trim() : ''
  const memberName = typeof row.member_name === 'string' ? row.member_name.trim() : ''
  const dynasty = typeof row.dynasty === 'string' ? row.dynasty.trim().toLowerCase() : ''

  if (!id || !memberName || !DYNASTIES.has(dynasty as Dynasty)) return null

  return {
    id,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    member_name: memberName,
    member_big: typeof row.member_big === 'string' && row.member_big.trim() ? row.member_big.trim() : null,
    dynasty: dynasty as Dynasty,
    is_dynasty_head: typeof row.is_dynasty_head === 'boolean' ? row.is_dynasty_head : null,
  }
}

export function membersToTreeData(rows: unknown[]): TreeData {
  const warnings: string[] = []
  const members: Member[] = []
  const ids = new Set<string>()

  rows.forEach((row, index) => {
    const member = parseMember(row)
    if (!member) {
      warnings.push(`Ignored malformed member at response index ${index}.`)
      return
    }
    if (ids.has(member.id)) {
      warnings.push(`Ignored duplicate member ID "${member.id}".`)
      return
    }
    ids.add(member.id)
    members.push(member)
  })

  members.sort((a, b) => a.member_name.localeCompare(b.member_name, undefined, { sensitivity: 'base' }))

  const users: Record<string, UserNode> = {}
  const memberById = new Map<string, Member>()
  const idByName = new Map<string, string>()

  for (const member of members) {
    memberById.set(member.id, member)
    users[member.id] = {
      name: member.member_name,
      dynasty: member.dynasty,
      littles: [],
      head: member.is_dynasty_head === true,
    }

    const normalizedName = normalizeName(member.member_name)
    if (idByName.has(normalizedName)) {
      warnings.push(`Duplicate member name "${member.member_name}"; relationships use the first match.`)
    } else {
      idByName.set(normalizedName, member.id)
    }
  }

  const parentByChild = new Map<string, string>()

  for (const member of members) {
    if (!member.member_big) continue

    const parentId = idByName.get(normalizeName(member.member_big))
    if (!parentId) {
      warnings.push(`Could not find big "${member.member_big}" for "${member.member_name}".`)
      continue
    }

    const parent = memberById.get(parentId)
    if (!parent || parent.dynasty !== member.dynasty) {
      warnings.push(`Ignored cross-dynasty relationship for "${member.member_name}".`)
      continue
    }

    let ancestorId: string | undefined = parentId
    while (ancestorId && ancestorId !== member.id) {
      ancestorId = parentByChild.get(ancestorId)
    }
    if (ancestorId === member.id) {
      warnings.push(`Ignored cyclic relationship for "${member.member_name}".`)
      continue
    }

    users[parentId].littles.push(member.id)
    parentByChild.set(member.id, parentId)
  }

  return { users, warnings }
}
