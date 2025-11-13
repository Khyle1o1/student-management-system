"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy } from "lucide-react"
import { DoubleEliminationBracketDiagram } from "./DoubleEliminationBracketDiagram"
import type { Match as BracketMatch } from "./TournamentBracket"
import type { DoubleEliminationSummary } from "@/lib/tournament-bracket"

interface Team {
  id: string
  name: string
  color?: string | null
  logo?: string | null
}

type Match = BracketMatch & {
  team1?: Team | null
  team2?: Team | null
  winner?: Team | null
}

interface Tournament {
  id: string
  name: string
  category: string
  bracket_type: string
  randomize_locked: boolean
  bracket_template?: DoubleEliminationSummary | null
}

interface BracketData {
  tournament: Tournament
  teams: Team[]
  matches: Match[]
  matches_by_round: Record<number, Match[]>
  rounds: number
}

interface PublicTournamentBracketProps {
  eventId: string
}

export function PublicTournamentBracket({ eventId }: PublicTournamentBracketProps) {
  const [data, setData] = useState<BracketData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBracket = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/intramurals/brackets?event_id=${eventId}`)
      if (response.ok) {
        const bracketData = await response.json()
        setData(bracketData)
      }
    } catch (error) {
      console.error("Error fetching bracket:", error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchBracket()
  }, [fetchBracket])

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
    return null
  }

  const { tournament, matches_by_round, matches, rounds } = data

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
                Round {round}
                {round === rounds && " (Final)"}
              </div>
              {standardMatches.map((match) => (
                <PublicMatchCard
                  key={match.id}
                  match={match}
                  isFinal={round === rounds}
                  isThirdPlace={false}
                />
              ))}
              {thirdPlaceMatches.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="text-center text-sm font-semibold text-muted-foreground">
                    3rd Place Match
                  </div>
                  {thirdPlaceMatches.map((match) => (
                    <PublicMatchCard
                      key={match.id}
                      match={match}
                      isFinal={false}
                      isThirdPlace={true}
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

  const renderDoubleElimination = () => {
    if (tournament.bracket_template) {
      return (
        <DoubleEliminationBracketDiagram
          template={tournament.bracket_template}
          matches={matches}
        />
      )
    }

    return renderStandardBracket()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {tournament.name} - Tournament Bracket
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {tournament.bracket_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {tournament.category}
        </p>
      </CardHeader>
      <CardContent>
        {tournament.bracket_type === "double_elimination"
          ? renderDoubleElimination()
          : renderStandardBracket()}
      </CardContent>
    </Card>
  )
}

interface PublicMatchCardProps {
  match: Match
  isFinal: boolean
  isThirdPlace: boolean
}

function PublicMatchCard({ match, isFinal, isThirdPlace }: PublicMatchCardProps) {
  const team1 = match.team1
  const team2 = match.team2
  const winner = match.winner
  const isCompleted = match.status === 'completed'
  const isBye = match.is_bye

  return (
    <Card 
      className={`transition-all ${
        isCompleted ? 'border-green-300 bg-green-50' : ''
      } ${isFinal && isCompleted ? 'border-yellow-400 border-2' : ''} ${
        isThirdPlace ? 'border-orange-300 bg-orange-50/70' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
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

