import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from './types'

// Breadth-first walk down manager_id chains to collect every descendant of rootId
// (direct reports, their reports, etc.), for managers-of-managers who need to see
// their whole unit, not just their direct reports.
export async function getSubtreeProfiles(supabase: SupabaseClient, rootId: string): Promise<Profile[]> {
  const all: Profile[] = []
  const seen = new Set<string>()
  let frontier = [rootId]

  while (frontier.length > 0) {
    const { data } = await supabase.from('profiles').select('*').in('manager_id', frontier)
    const next: string[] = []
    for (const p of (data || []) as Profile[]) {
      if (seen.has(p.id)) continue
      seen.add(p.id)
      all.push(p)
      next.push(p.id)
    }
    frontier = next
  }

  return all
}

export function buildChildrenMap(profiles: Profile[]): Map<string, Profile[]> {
  const map = new Map<string, Profile[]>()
  for (const p of profiles) {
    if (!p.manager_id) continue
    const list = map.get(p.manager_id) ?? []
    list.push(p)
    map.set(p.manager_id, list)
  }
  for (const list of map.values()) list.sort((a, b) => a.full_name.localeCompare(b.full_name))
  return map
}
