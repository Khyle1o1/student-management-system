import React from 'react'
import { DoubleEliminationSummary } from '@/lib/tournament-bracket'

interface DoubleEliminationBracketPreviewProps {
  bracket: DoubleEliminationSummary | undefined
  className?: string
}

const RoundColumn: React.FC<{
  title: string
  rounds: DoubleEliminationSummary['winnersBracket']
}> = ({ title, rounds }) => {
  if (!rounds.length) return null

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-row gap-4 overflow-x-auto">
        {rounds.map(round => (
          <div
            key={round.id}
            className="min-w-[220px] rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-foreground">{round.name}</p>
            <div className="flex flex-col gap-2">
              {round.matches.map(match => (
                <div
                  key={match.id}
                  className="rounded border border-border bg-background p-2 text-sm"
                >
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    {match.name}
                  </p>
                  <div className="flex flex-col gap-1">
                    <span
                      className={
                        match.winner === match.team1
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                      }
                    >
                      {match.team1 ?? 'BYE'}
                    </span>
                    <span
                      className={
                        match.winner === match.team2
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                      }
                    >
                      {match.team2 ?? 'BYE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const FinalsColumn: React.FC<{ matches: DoubleEliminationSummary['finals'] }> = ({
  matches,
}) => {
  if (!matches.length) return null

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Finals
      </h3>
      <div className="flex flex-row gap-4">
        {matches.map(match => (
          <div
            key={match.id}
            className="min-w-[220px] rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-foreground">{match.name}</p>
            <div className="flex flex-col gap-1 text-sm">
              <span
                className={
                  match.winner === match.team1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }
              >
                {match.team1 ?? 'BYE'}
              </span>
              <span
                className={
                  match.winner === match.team2
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }
              >
                {match.team2 ?? 'BYE'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const RankingsCard: React.FC<{
  rankings: DoubleEliminationSummary['rankings']
}> = ({ rankings }) => {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Final Standings
      </h3>
      <ol className="flex flex-col gap-2 text-sm">
        <li>
          <span className="font-semibold text-foreground">Champion:</span>{' '}
          <span>{rankings.champion ?? 'TBD'}</span>
        </li>
        <li>
          <span className="font-semibold text-foreground">Runner-up:</span>{' '}
          <span>{rankings.runnerUp ?? 'TBD'}</span>
        </li>
        <li>
          <span className="font-semibold text-foreground">3rd Place:</span>{' '}
          <span>{rankings.thirdPlace ?? 'TBD'}</span>
        </li>
      </ol>
    </div>
  )
}

export const DoubleEliminationBracketPreview: React.FC<
  DoubleEliminationBracketPreviewProps
> = ({ bracket, className }) => {
  if (!bracket) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">
          Generate a bracket to see the full tournament layout.
        </p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-8 ${className ?? ''}`}>
      <RoundColumn title="Winners Bracket" rounds={bracket.winnersBracket} />
      <RoundColumn title="Losers Bracket" rounds={bracket.losersBracket} />
      <FinalsColumn matches={bracket.finals} />
      <RankingsCard rankings={bracket.rankings} />
    </div>
  )
}

export default DoubleEliminationBracketPreview

