import { SupabaseClient } from '@supabase/supabase-js'
import { flattenDoubleEliminationTemplate, BracketMatchDetail, DoubleEliminationSummary } from './tournament-bracket'
const ROUND_OFFSETS: Record<BracketMatchDetail['bracket'], number> = {
  winners: 0,
  losers: 100,
  final: 200,
  grand_final: 300,
}

export function getDoubleEliminationRoundIndex(match: BracketMatchDetail): number {
  const base =
    ROUND_OFFSETS[match.bracket] ?? 0
  const round =
    match.stageRound ??
    match.round ??
    0

  return base + round
}


type SupabaseLikeClient = Pick<SupabaseClient<any, 'public', any>, 'from'>

interface EnsureMatchOptions {
  supabase: SupabaseLikeClient
  tournamentId: string
  templateMatch: BracketMatchDetail
}

interface AssignTeamOptions extends EnsureMatchOptions {
  teamId: string
  position: 1 | 2
}

interface AdvanceMatchOptions {
  supabase: SupabaseLikeClient
  tournamentId: string
  templateSummary?: DoubleEliminationSummary | null
  templateMap?: Record<string, BracketMatchDetail>
  match: any
  winnerId: string | null
  loserId?: string | null
}

function determineLoserId(match: any, winnerId: string | null): string | null {
  if (!winnerId) return null
  if (match.team1_id && match.team1_id !== winnerId) return match.team1_id
  if (match.team2_id && match.team2_id !== winnerId) return match.team2_id
  return null
}

async function fetchMatchByTemplate(
  supabase: SupabaseLikeClient,
  tournamentId: string,
  templateKey: string
) {
  const { data, error } = await supabase
    .from('intramurals_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('template_key', templateKey)
    .limit(1)

  if (error) {
    throw error
  }

  return data?.[0] || null
}

async function ensureMatchExists({
  supabase,
  tournamentId,
  templateMatch,
}: EnsureMatchOptions) {
  const existing = await fetchMatchByTemplate(
    supabase,
    tournamentId,
    templateMatch.templateKey
  )

  if (existing) {
    return existing
  }

  const roundIndex = getDoubleEliminationRoundIndex(templateMatch)

  const insertPayload = {
    tournament_id: tournamentId,
    round: roundIndex,
    match_number: templateMatch.matchNumber,
    team1_id: null,
    team2_id: null,
    winner_id: null,
    is_bye: templateMatch.isBye,
    is_third_place: false,
    status: templateMatch.isBye ? 'pending' : 'pending',
    completed_at: null,
    bracket_stage: templateMatch.bracket,
    stage_round: templateMatch.stageRound,
    display_label: templateMatch.name,
    template_key: templateMatch.templateKey,
  }

  const { data, error } = await supabase
    .from('intramurals_matches')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

async function assignTeamToMatch({
  supabase,
  tournamentId,
  templateMatch,
  teamId,
  position,
}: AssignTeamOptions) {
  const matchRecord = await ensureMatchExists({
    supabase,
    tournamentId,
    templateMatch,
  })

  const existingTeam1 = position === 1 ? teamId : matchRecord.team1_id
  const existingTeam2 = position === 2 ? teamId : matchRecord.team2_id

  const updatePayload: Record<string, any> = {
    status: 'pending',
  }

  if (position === 1) {
    updatePayload.team1_id = teamId
  } else {
    updatePayload.team2_id = teamId
  }

  if (templateMatch.isBye) {
    const winner = existingTeam1 || existingTeam2
    updatePayload.winner_id = winner
    updatePayload.status = 'completed'
    updatePayload.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('intramurals_matches')
    .update(updatePayload)
    .eq('id', matchRecord.id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function advanceDoubleEliminationMatch({
  supabase,
  tournamentId,
  templateSummary,
  templateMap: providedTemplateMap,
  match,
  winnerId,
  loserId,
}: AdvanceMatchOptions): Promise<void> {
  if (!templateSummary) {
    return
  }

  const templateMap =
    providedTemplateMap || flattenDoubleEliminationTemplate(templateSummary)

  if (!match?.template_key) {
    return
  }

  const templateMatch = templateMap[match.template_key]
  if (!templateMatch) {
    return
  }

  const resolvedWinnerId = winnerId || match.winner_id || null
  const resolvedLoserId =
    typeof loserId !== 'undefined' ? loserId : determineLoserId(match, resolvedWinnerId)

  // Progress winner
  if (resolvedWinnerId && templateMatch.nextTemplateKey) {
    const nextTemplate = templateMap[templateMatch.nextTemplateKey]
    if (nextTemplate) {
      const nextMatchRecord = await assignTeamToMatch({
        supabase,
        tournamentId,
        templateMatch: nextTemplate,
        teamId: resolvedWinnerId,
        position: (templateMatch.nextMatchPosition as 1 | 2) || 1,
      })

      if (nextTemplate.isBye && nextMatchRecord?.winner_id) {
        await advanceDoubleEliminationMatch({
          supabase,
          tournamentId,
          templateSummary,
          templateMap,
          match: nextMatchRecord,
          winnerId: nextMatchRecord.winner_id,
        })
      }
    }
  }

  // Progress loser (only if they still have life left)
  if (resolvedLoserId && templateMatch.loserNextTemplateKey) {
    const loserTemplate = templateMap[templateMatch.loserNextTemplateKey]
    if (loserTemplate) {
      const loserMatchRecord = await assignTeamToMatch({
        supabase,
        tournamentId,
        templateMatch: loserTemplate,
        teamId: resolvedLoserId,
        position: (templateMatch.loserNextMatchPosition as 1 | 2) || 1,
      })

      if (loserTemplate.isBye && loserMatchRecord?.winner_id) {
        await advanceDoubleEliminationMatch({
          supabase,
          tournamentId,
          templateSummary,
          templateMap,
          match: loserMatchRecord,
          winnerId: loserMatchRecord.winner_id,
        })
      }
    }
  }
}

