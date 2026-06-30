import type { PlacedCourse, ProgramTerm } from '../types'
import { supabase } from './supabase'

export interface PlanState {
  terms: ProgramTerm[]
  placed: PlacedCourse[]
}

export interface PlanRow {
  id: string
  name: string
  program_id: string
  aoe_id: string | null
  state: PlanState
  share_id: string | null
  is_public: boolean
  updated_at: string
}

export interface SavePlanInput {
  id?: string
  name: string
  programId: string
  aoeId: string | null
  state: PlanState
}

function client() {
  if (!supabase) throw new Error('Cloud sync is not configured.')
  return supabase
}

export async function listMyPlans(): Promise<PlanRow[]> {
  const { data, error } = await client()
    .from('plans')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PlanRow[]
}

export async function savePlan(input: SavePlanInput): Promise<PlanRow> {
  const sb = client()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const row = {
    name: input.name,
    program_id: input.programId,
    aoe_id: input.aoeId,
    state: input.state,
    user_id: user.id,
    ...(input.id ? { id: input.id } : {}),
  }
  const { data, error } = await sb.from('plans').upsert(row).select().single()
  if (error) throw error
  return data as PlanRow
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await client().from('plans').delete().eq('id', id)
  if (error) throw error
}

const randomShareId = () =>
  Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6)

/** Make a plan public and ensure it has a share id; returns the share id. */
export async function sharePlan(row: PlanRow): Promise<string> {
  const shareId = row.share_id ?? randomShareId()
  const { error } = await client()
    .from('plans')
    .update({ is_public: true, share_id: shareId })
    .eq('id', row.id)
  if (error) throw error
  return shareId
}

export async function loadSharedPlan(shareId: string): Promise<PlanRow | null> {
  const { data, error } = await client()
    .from('plans')
    .select('*')
    .eq('share_id', shareId)
    .eq('is_public', true)
    .maybeSingle()
  if (error) throw error
  return (data as PlanRow) ?? null
}
