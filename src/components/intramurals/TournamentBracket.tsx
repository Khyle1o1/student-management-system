"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Lock, Shuffle } from "lucide-react"
import { toast } from "react-hot-toast"
import { DoubleEliminationBracketDiagram } from "./DoubleEliminationBracketDiagram"
import type { DoubleEliminationSummary } from "@/lib/tournament-bracket"

interface Team {
  id: string
  name: string
  color?: string | null
  logo?: string | null
}

export interface Match {
  id: string
  round: number
  match_number: number
  team1_id: string | null
  team2_id: string | null
  winner_id: string | null
  team1_score: number | null
  team2_score: number | null
  is_bye: boolean
  status: string
  is_third_place?: boolean
  team1?: Team | null
  team2?: Team | null
  winner?: Team | null
  bracket_stage?: 'winners' | 'losers' | 'final' | 'grand_final' | null
  stage_round?: number | null
  display_label?: string | null
  template_key?: string | null
  next_match_id?: string | null
  next_match_position?: number | null
  loser_next_match_id?: string | null
  loser_next_match_position?: number | null
}

interface Tournament {
  id: string
  name: string
  category: string
  bracket_type: string
  randomize_locked: boolean
  randomize_count: number
  max_random_attempts: number
  bracket_template?: DoubleEliminationSummary | null
}

interface BracketData {
  tournament: Tournament
  teams: Team[]
  matches: Match[]
  matches_by_round: Record<number, Match[]>
  rounds: number
}

interface TournamentBracketProps {
  tournamentId: string
  onUpdate?: () => void
}

export function TournamentBracket({ tournamentId, onUpdate }: TournamentBracketProps) {
  const [data, setData] = useState<BracketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  const fetchBracket = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/intramurals/brackets?event_id=${tournamentId}`)
      if (response.ok) {
        const bracketData = await response.json()
        setData(bracketData)
      } else {
        toast.error("Failed to load bracket")
      }
    } catch (error) {
      console.error("Error fetching bracket:", error)
      toast.error("Failed to load bracket")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    fetchBracket()
  }, [fetchBracket])

  const handleRandomize = async () => {
    try {
      const response = await fetch(`/api/intramurals/admin/tournaments/${tournamentId}/randomize`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Bracket randomized successfully")
        fetchBracket()
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to randomize bracket")
      }
    } catch (error) {
      console.error("Error randomizing bracket:", error)
      toast.error("Failed to randomize bracket")
    }
  }

  const handleLock = async () => {
    try {
      const response = await fetch(`/api/intramurals/admin/tournaments/${tournamentId}/lock`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Bracket locked successfully")
        fetchBracket()
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to lock bracket")
      }
    } catch (error) {
      console.error("Error locking bracket:", error)
      toast.error("Failed to lock bracket")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#191970] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading bracket...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-600">
        No bracket data available
      </div>
    )
  }

  const { tournament, matches_by_round, matches, rounds } = data
  const canRandomize = !tournament.randomize_locked && 
    tournament.randomize_count < tournament.max_random_attempts

  const groupStageRounds = (
    stage: 'winners' | 'losers'
  ): { stageRound: number; matches: Match[] }[] => {
    const stageMatches = (matches || []).filter(match => {
      if (match.bracket_stage !== stage) {
        return false
      }
      const hasTeamAssigned =
        !!match.team1 ||
        !!match.team2 ||
        !!match.team1_id ||
        !!match.team2_id ||
        match.is_bye
      return hasTeamAssigned
    })

    const grouped = new Map<number, Match[]>()
    stageMatches.forEach(match => {
      const key = match.stage_round ?? match.round ?? 0
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(match)
    })

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([stageRound, stageMatches]) => ({
        stageRound,
        matches: stageMatches.sort(
          (a, b) => (a.match_number || 0) - (b.match_number || 0)
        ),
      }))
  }

  const renderStandardBracket = () => (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max pb-8">
        {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = matches_by_round[round] || []
          const standardMatches = roundMatches.filter((m: Match) => !m.is_third_place)
          const thirdPlaceMatches = roundMatches.filter((m: Match) => m.is_third_place)
          return (
            <div key={round} className="flex flex-col gap-4 min-w-[200px]">
              <div className="text-center font-semibold text-lg mb-2">
                {round === rounds ? 'Round ' + round + ' (Final)' : `Round ${round}`}
              </div>
              {standardMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  isFinal={round === rounds}
                  isThirdPlace={false}
                  header={match.display_label || undefined}
                  onSelect={() => setSelectedMatch(match)}
                />
              ))}
              {thirdPlaceMatches.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="text-center text-sm font-semibold text-muted-foreground">
                    3rd Place Match
                  </div>
                  {thirdPlaceMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      isFinal={false}
                      isThirdPlace={true}
                      header={match.display_label || '3rd Place'}
                      onSelect={() => setSelectedMatch(match)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderStageBracket = (
    title: string,
    stage: 'winners' | 'losers',
    emptyMessage?: string
  ) => {
    const groupedRounds = groupStageRounds(stage)
    if (groupedRounds.length === 0) {
      return emptyMessage ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : null
    }

    const stageLabelPrefix = title.replace(/ Bracket$/i, '')

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {groupedRounds.map(({ stageRound, matches: stageMatches }) => (
            <div key={`${stage}-${stageRound}`} className="flex min-w-[220px] flex-col gap-4">
              <div className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {`${stageLabelPrefix} Round ${stageRound}`}
              </div>
              {stageMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  header={match.display_label || undefined}
                  isFinal={false}
                  isThirdPlace={false}
                  onSelect={() => setSelectedMatch(match)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderFinals = () => {
    const finalsMatches = (matches || [])
      .filter(
        match =>
          match.bracket_stage === 'final' ||
          match.bracket_stage === 'grand_final'
      )
      .filter(match => {
        const hasTeamAssigned =
          !!match.team1 ||
          !!match.team2 ||
          !!match.team1_id ||
          !!match.team2_id ||
          match.is_bye
        return hasTeamAssigned
      })
      .sort((a, b) => (a.stage_round || 0) - (b.stage_round || 0))

    if (finalsMatches.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Finals</h3>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {finalsMatches.map(match => {
            const title =
              match.bracket_stage === 'grand_final' ? 'Grand Final' : 'Final'
            return (
              <div key={match.id} className="flex min-w-[220px] flex-col gap-4">
                <div className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {title}
                </div>
                <MatchCard
                  match={match}
                  header={match.display_label || title}
                  isFinal
                  isThirdPlace={false}
                  onSelect={() => setSelectedMatch(match)}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDoubleEliminationBracket = () => {
    if (tournament.bracket_template) {
      return (
        <div className="space-y-6">
          <DoubleEliminationBracketDiagram
            template={tournament.bracket_template}
            matches={matches}
            onSelectMatch={(match) => {
              if (match) {
                setSelectedMatch(match)
              }
            }}
          />
          <p className="text-sm text-muted-foreground">
            Click a match to enter results. Bracket lines update automatically as winners advance.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-10">
        {renderStageBracket('Winners Bracket', 'winners', 'No winners bracket matches yet.')}
        {renderStageBracket('Losers Bracket', 'losers', 'No losers bracket matches yet.')}
        {renderFinals()}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {tournament.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {tournament.bracket_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {tournament.category}
              </p>
            </div>
            <div className="flex gap-2">
              {canRandomize && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRandomize}
                >
                  <Shuffle className="mr-2 h-4 w-4" />
                  Randomize Again
                </Button>
              )}
              {!tournament.randomize_locked && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleLock}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Lock Bracket
                </Button>
              )}
              {tournament.randomize_locked && (
                <Badge className="bg-green-100 text-green-800">
                  <Lock className="mr-1 h-3 w-3" />
                  Locked
                </Badge>
              )}
            </div>
          </div>
          {tournament.randomize_count > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Randomizations used: {tournament.randomize_count} / {tournament.max_random_attempts}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Bracket Display */}
      {tournament.bracket_type === 'double_elimination'
        ? renderDoubleEliminationBracket()
        : renderStandardBracket()}

      {/* Match Result Dialog */}
      {selectedMatch && (
        <MatchResultDialog
          match={selectedMatch}
          tournament={tournament}
          onClose={() => setSelectedMatch(null)}
          onUpdate={async () => {
            await fetchBracket()
            onUpdate?.()
          }}
        />
      )}
    </div>
  )
}

interface MatchCardProps {
  match: Match
  isFinal: boolean
  isThirdPlace: boolean
  onSelect: () => void
  header?: string
}

function MatchCard({ match, isFinal, isThirdPlace, onSelect, header }: MatchCardProps) {
  const team1 = match.team1
  const team2 = match.team2
  const winner = match.winner
  const isCompleted = match.status === 'completed'
  const isBye = match.is_bye

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isCompleted ? 'border-green-300 bg-green-50' : ''
      } ${isFinal && isCompleted ? 'border-yellow-400 border-2' : ''} ${
        isThirdPlace ? 'border-orange-300 bg-orange-50/70' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          {header && (
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {header}
            </div>
          )}
          {/* Team 1 */}
          <div className={`flex items-center justify-between p-2 rounded ${
            winner?.id === team1?.id ? 'bg-yellow-100 font-semibold' : ''
          }`}>
            <span className="truncate">{team1?.name || 'Bye'}</span>
            {match.team1_score !== null && (
              <Badge variant="outline">{match.team1_score}</Badge>
            )}
          </div>

          {/* VS */}
          {!isBye && (
            <div className="text-center text-xs text-muted-foreground">VS</div>
          )}

          {/* Team 2 */}
          {!isBye && (
            <div className={`flex items-center justify-between p-2 rounded ${
              winner?.id === team2?.id ? 'bg-yellow-100 font-semibold' : ''
            }`}>
              <span className="truncate">{team2?.name || 'TBD'}</span>
              {match.team2_score !== null && (
                <Badge variant="outline">{match.team2_score}</Badge>
              )}
            </div>
          )}

          {/* Status */}
          <div className="text-xs text-center text-muted-foreground">
            {isBye ? 'Bye' : isCompleted ? 'Completed' : 'Pending'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MatchResultDialogProps {
  match: Match
  tournament: Tournament
  onClose: () => void
  onUpdate: () => Promise<void> | void
}

function MatchResultDialog({ match, tournament, onClose, onUpdate }: MatchResultDialogProps) {
  const [winnerId, setWinnerId] = useState<string>(match.winner_id || "")
  const [team1Score, setTeam1Score] = useState<string>(match.team1_score?.toString() || "")
  const [team2Score, setTeam2Score] = useState<string>(match.team2_score?.toString() || "")
  const [saving, setSaving] = useState(false)

  if (!tournament.randomize_locked) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md m-4">
          <CardHeader>
            <CardTitle>Bracket Not Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please lock the bracket before entering match results.
            </p>
            <Button onClick={onClose} className="w-full">Close</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSave = async () => {
    if (!winnerId) {
      toast.error("Please select a winner")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/intramurals/admin/matches/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winner_id: winnerId,
          team1_score: team1Score ? parseInt(team1Score) : null,
          team2_score: team2Score ? parseInt(team2Score) : null,
        }),
      })

      if (response.ok) {
        toast.success("Match result saved")
        onClose()
        // Refresh bracket data to show updated matches (winners advanced)
        if (onUpdate) {
          await Promise.resolve(onUpdate())
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save match result")
      }
    } catch (error) {
      console.error("Error saving match result:", error)
      toast.error("Failed to save match result")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Enter Match Result</CardTitle>
          <p className="text-sm text-muted-foreground">
            Round {match.round}, Match {match.match_number}
            {match.is_third_place ? " • 3rd Place Playoff" : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Winner</label>
            <select
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select winner</option>
              {match.team1 && <option value={match.team1.id}>{match.team1.name}</option>}
              {match.team2 && <option value={match.team2.id}>{match.team2.name}</option>}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {match.team1?.name || "Team 1"} Score
              </label>
              <input
                type="number"
                value={team1Score}
                onChange={(e) => setTeam1Score(e.target.value)}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {match.team2?.name || "Team 2"} Score
              </label>
              <input
                type="number"
                value={team2Score}
                onChange={(e) => setTeam2Score(e.target.value)}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save Result"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

