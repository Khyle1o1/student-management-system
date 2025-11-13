import { memo, useMemo } from "react"
import { Card } from "@/components/ui/card"
import type { DoubleEliminationSummary, BracketMatchDetail } from "@/lib/tournament-bracket"
import type { Match } from "./TournamentBracket"

type DiagramMatch = {
  template: BracketMatchDetail
  match?: Match
  x: number
  y: number
  bracket: BracketMatchDetail['bracket']
}

type LayoutConfig = {
  columnWidth: number
  matchWidth: number
  matchHeight: number
  baseSpacing: number
  offsetX: number
  offsetY: number
  spacingStrategy: "power" | "linear"
}

const defaultConfig = {
  columnWidth: 250,
  matchWidth: 180,
  matchHeight: 120,
  baseSpacing: 72,
  offsetX: 80,
  offsetY: 40,
}

interface DoubleEliminationBracketDiagramProps {
  template: DoubleEliminationSummary
  matches: Match[]
  onSelectMatch?: (match?: Match) => void
}

export const DoubleEliminationBracketDiagram = memo(function DoubleEliminationBracketDiagram({
  template,
  matches,
  onSelectMatch,
}: DoubleEliminationBracketDiagramProps) {
  const { nodes, edges, width, height } = useMemo(
    () => buildDiagram(template, matches, defaultConfig),
    [template, matches]
  )

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="relative mx-auto"
        style={{
          width: width + defaultConfig.offsetX * 2,
          height: height + defaultConfig.offsetY * 2,
        }}
      >
        <svg
          width={width + defaultConfig.offsetX * 2}
          height={height + defaultConfig.offsetY * 2}
          className="absolute left-0 top-0"
        >
          {edges.map(edge => {
            const from = nodes.get(edge.from)
            const to = nodes.get(edge.to)
            if (!from || !to) return null

            const startX = defaultConfig.offsetX + from.x + defaultConfig.matchWidth
            const startY = defaultConfig.offsetY + from.y
            const endX = defaultConfig.offsetX + to.x
            const endY = defaultConfig.offsetY + to.y
            const midX = startX + (endX - startX) * 0.6

            const stroke =
              edge.type === "grand_final"
                ? "#6B7280"
                : edge.type === "loser"
                ? "#4B5563"
                : "#1F2937"

            const strokeDasharray = edge.type === "grand_final" ? "10,6" : "none"
            const strokeWidth = edge.type === "grand_final" ? 2 : 3

            return (
              <path
                key={`${edge.from}-${edge.to}-${edge.type}`}
                d={`M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                fill="none"
              />
            )
          })}
        </svg>

        <div className="absolute left-4 top-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Winners
        </div>
        <div
          className="absolute text-xs font-semibold uppercase tracking-wider text-slate-500"
          style={{ left: 4, top: defaultConfig.offsetY + (height * 0.55) }}
        >
          Losers
        </div>

        {Array.from(nodes.entries()).map(([key, node]) => (
          <BracketMatchBox
            key={key}
            template={node.template}
            match={node.match}
            x={node.x + defaultConfig.offsetX}
            y={node.y + defaultConfig.offsetY}
            width={defaultConfig.matchWidth}
            height={defaultConfig.matchHeight}
            onSelect={onSelectMatch}
          />
        ))}
      </div>
    </div>
  )
})

const BracketMatchBox = memo(function BracketMatchBox({
  template,
  match,
  x,
  y,
  width,
  height,
  onSelect,
}: {
  template: BracketMatchDetail
  match?: Match
  x: number
  y: number
  width: number
  height: number
  onSelect?: (match?: Match) => void
}) {
  const team1 = match?.team1
  const team2 = match?.team2
  const winner = match?.winner
  const isBye = Boolean(match?.is_bye || template.isBye)

  return (
    <Card
      className={`absolute border border-slate-300 bg-white shadow-sm transition-colors ${
        onSelect && match ? "cursor-pointer hover:border-[#191970]" : ""
      }`}
      style={{
        width,
        height,
        left: x,
        top: y - height / 2,
        padding: "12px 16px",
      }}
      onClick={() => onSelect?.(match)}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {template.name}
      </div>
      <div className="mt-2 space-y-1.5 text-sm">
        <LineItem
          label={team1?.name || template.team1 || "TBD"}
          score={match?.team1_score ?? undefined}
          active={winner?.id === team1?.id}
        />
        <LineItem
          label={team2?.name || template.team2 || (isBye ? "Bye" : "TBD")}
          score={match?.team2_score ?? undefined}
          active={winner?.id === team2?.id}
          dim={isBye}
        />
      </div>
    </Card>
  )
})

const LineItem = memo(function LineItem({
  label,
  score,
  active,
  dim,
}: {
  label: string
  score?: number
  active?: boolean
  dim?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between rounded px-2 py-1 ${
        active ? "bg-yellow-100 font-semibold text-slate-800" : ""
      } ${dim ? "text-slate-400" : "text-slate-700"}`}
    >
      <span className="truncate">{label}</span>
      {typeof score === "number" && (
        <span className="ml-2 flex-shrink-0 text-[12px] font-semibold text-slate-600">
          {score}
        </span>
      )}
    </div>
  )
})

type Edge = {
  from: string
  to: string
  type: "winner" | "loser" | "grand_final"
}

function buildDiagram(template: DoubleEliminationSummary, matches: Match[], config: typeof defaultConfig) {
  const matchByTemplate = new Map(
    matches
      .filter(match => match.template_key)
      .map(match => [match.template_key as string, match])
  )

  const nodes = new Map<string, DiagramMatch>()
  const edges: Edge[] = []

  const winnersLayout = layoutRounds(template.winnersBracket, matchByTemplate, {
    ...config,
    spacingStrategy: "power",
    offsetX: 0,
    offsetY: 0,
  })

  winnersLayout.nodes.forEach((node, key) => nodes.set(key, node))
  edges.push(...winnersLayout.edges)

  const winnersHeight = winnersLayout.height
  const losersOffset = winnersHeight + config.baseSpacing * 2.5

  const losersLayout = layoutRounds(template.losersBracket, matchByTemplate, {
    ...config,
    spacingStrategy: "linear",
    offsetX: 0,
    offsetY: losersOffset,
    baseSpacing: defaultConfig.baseSpacing * 0.9,
  })

  losersLayout.nodes.forEach((node, key) => nodes.set(key, node))
  edges.push(...losersLayout.edges)

  const finalsLayout = layoutFinals(template, matchByTemplate, winnersLayout.width + config.columnWidth, nodes, config)

  finalsLayout.nodes.forEach((node, key) => nodes.set(key, node))
  edges.push(...finalsLayout.edges)

  const width = Math.max(winnersLayout.width, losersLayout.width, finalsLayout.width)
  const height = Math.max(losersLayout.height, winnersLayout.height, finalsLayout.height)

  return { nodes, edges, width, height }
}

function layoutRounds(
  rounds: DoubleEliminationSummary['winnersBracket'],
  matchByTemplate: Map<string, Match>,
  config: LayoutConfig
) {
  const nodes = new Map<string, DiagramMatch>()
  const edges: Edge[] = []

  let maxX = 0
  let maxY = 0

  rounds
    .slice()
    .sort((a, b) => a.stageRound - b.stageRound)
    .forEach((round, roundIndex) => {
      const matches = round.matches.slice().sort((a, b) => a.matchNumber - b.matchNumber)

      const spacing =
        config.spacingStrategy === "power"
          ? config.baseSpacing * Math.pow(2, roundIndex)
          : config.baseSpacing * (roundIndex + 1)

      matches.forEach((templateMatch, matchIndex) => {
        const centerY = config.offsetY + spacing * (matchIndex * 2 + 1)
        const x = config.offsetX + roundIndex * config.columnWidth

        nodes.set(templateMatch.templateKey, {
          template: templateMatch,
          match: matchByTemplate.get(templateMatch.templateKey),
          x,
          y: centerY,
          bracket: templateMatch.bracket,
        })

        maxX = Math.max(maxX, x + config.matchWidth)
        maxY = Math.max(maxY, centerY + config.matchHeight)

        if (templateMatch.nextTemplateKey) {
          edges.push({
            from: templateMatch.templateKey,
            to: templateMatch.nextTemplateKey,
            type: "winner",
          })
        }
        if (templateMatch.loserNextTemplateKey) {
          edges.push({
            from: templateMatch.templateKey,
            to: templateMatch.loserNextTemplateKey,
            type: "loser",
          })
        }
      })
    })

  return {
    nodes,
    edges,
    width: maxX,
    height: maxY,
  }
}

function layoutFinals(
  template: DoubleEliminationSummary,
  matchByTemplate: Map<string, Match>,
  startX: number,
  referenceNodes: Map<string, DiagramMatch>,
  config: typeof defaultConfig
) {
  const finals = template.finals.slice()
  const resultNodes = new Map<string, DiagramMatch>()
  const edges: Edge[] = []

  if (finals.length === 0) {
    return { nodes: resultNodes, edges, width: startX, height: 0 }
  }

  const matchHeight = config.matchHeight
  const columnWidth = config.columnWidth

  const referenceFinalKey = template.winnersBracket.at(-1)?.matches.at(-1)?.templateKey ?? ""

  const finalsStartY =
    referenceNodes.get(finals[0].templateKey)?.y ??
    referenceNodes.get(referenceFinalKey)?.y ??
    config.baseSpacing * 2

  finals.forEach((templateMatch, index) => {
    const x = startX + index * columnWidth
    const centerY = finalsStartY + (index > 0 ? index * config.baseSpacing * 1.35 : 0)

    resultNodes.set(templateMatch.templateKey, {
      template: templateMatch,
      match: matchByTemplate.get(templateMatch.templateKey),
      x,
      y: centerY,
      bracket: templateMatch.bracket,
    })

    if (templateMatch.nextTemplateKey) {
      edges.push({
        from: templateMatch.templateKey,
        to: templateMatch.nextTemplateKey,
        type: templateMatch.bracket === "final" ? "grand_final" : "winner",
      })
    }

    if (templateMatch.loserNextTemplateKey) {
      edges.push({
        from: templateMatch.templateKey,
        to: templateMatch.loserNextTemplateKey,
        type: "loser",
      })
    }
  })

  const width = startX + finals.length * columnWidth + config.matchWidth
  const height = Math.max(...Array.from(resultNodes.values()).map(node => node.y + matchHeight))

  return { nodes: resultNodes, edges, width, height }
}

