"use client"

import { useState, useEffect } from "react"
import { Trophy, Medal, Award, Clock } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

interface StandingsEntry {
  rank: number
  team_id: string
  team_name: string
  team_color: string | null
  team_logo: string | null
  gold: number
  silver: number
  bronze: number
  total: number
}

interface PointsStandingsEntry {
  rank: number
  team_id: string
  team_name: string
  team_color: string | null
  team_logo: string | null
  total_points: number
}

type StandingsScope = "sports" | "socio_cultural"

export interface MedalEventBreakdown {
  event_id: string
  event_name: string
  category: "sports" | "socio_cultural"
  gold: number
  silver: number
  bronze: number
}

interface SelectedTeamDetails {
  team_id: string
  team_name: string
  team_color: string | null
  team_logo: string | null
  rank: number
  scope: StandingsScope
  // For sports (medals)
  gold?: number
  silver?: number
  bronze?: number
  total?: number
  // For socio-cultural (points)
  total_points?: number
  eventsBreakdown?: any[]
}

interface MedalDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  team: SelectedTeamDetails | null
}

const MedalDetailsModal: React.FC<MedalDetailsModalProps> = ({ isOpen, onClose, team }) => {
  if (!isOpen || !team) return null

  const {
    team_name,
    team_logo,
    team_color,
    rank,
    scope,
    gold,
    silver,
    bronze,
    total,
    total_points,
    eventsBreakdown,
  } = team

  const isSports = scope === "sports"
  const formatCategoryLabel = (category: string) =>
    category === "sports" ? "Sports" : "Socio-Cultural"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 border-b px-4 sm:px-6 py-3 sm:py-4">
          {team_logo ? (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={team_logo}
                alt={team_name}
                className="w-full h-full object-cover"
                style={{ objectFit: "cover", width: "150%", height: "150%" }}
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: team_color || "#191970" }}
            >
              {team_name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-[#191970] text-base sm:text-lg truncate">
              {team_name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Rank #{rank}
              {isSports && typeof total === "number" && (
                <span className="ml-1">&bull; Total Medals: {total}</span>
              )}
              {!isSports && typeof total_points === "number" && (
                <span className="ml-1">&bull; Total Points: {total_points}</span>
              )}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 space-y-4 sm:space-y-5">
          {/* Medal summary for Sports */}
          {isSports && (
            <div>
              <h4 className="text-sm font-semibold text-[#191970] mb-2">🏆 Medal Summary</h4>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                <div className="rounded-lg border border-yellow-100 bg-yellow-50 px-2 py-2 sm:py-3">
                  <div className="text-lg sm:text-xl">🥇</div>
                  <div className="text-xs sm:text-sm text-slate-600">Gold</div>
                  <div className="font-semibold text-[#191970] text-sm sm:text-base">
                    {gold || 0}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 sm:py-3">
                  <div className="text-lg sm:text-xl">🥈</div>
                  <div className="text-xs sm:text-sm text-slate-600">Silver</div>
                  <div className="font-semibold text-[#191970] text-sm sm:text-base">
                    {silver || 0}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-2 sm:py-3">
                  <div className="text-lg sm:text-xl">🥉</div>
                  <div className="text-xs sm:text-sm text-slate-600">Bronze</div>
                  <div className="font-semibold text-[#191970] text-sm sm:text-base">
                    {bronze || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Points summary for Socio-Cultural */}
          {!isSports && (
            <div>
              <h4 className="text-sm font-semibold text-[#191970] mb-2">🎭 Points Summary</h4>
              <div className="rounded-lg border border-purple-100 bg-purple-50 px-4 py-6 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-[#191970] mb-2">
                  {total_points || 0}
                </div>
                <div className="text-sm sm:text-base text-slate-600">Total Points</div>
                <div className="text-xs text-slate-500 mt-2">
                  Based on event placements (1st=10, 2nd=7, 3rd=5, 4th=3, 5th=1)
                </div>
              </div>
            </div>
          )}

          {/* Optional per-event breakdown */}
          {eventsBreakdown && eventsBreakdown.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#191970] mb-2">
                Events Breakdown
              </h4>
              <div className="max-h-52 overflow-y-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-slate-700">
                      <th className="px-3 py-2 font-semibold">Event</th>
                      {isSports ? (
                        <>
                          <th className="px-3 py-2 font-semibold text-right">🥇</th>
                          <th className="px-3 py-2 font-semibold text-right">🥈</th>
                          <th className="px-3 py-2 font-semibold text-right">🥉</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 font-semibold text-center">Placement</th>
                          <th className="px-3 py-2 font-semibold text-right">Points</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {eventsBreakdown.map((event: any, index: number) => (
                      <tr
                        key={`${event.event_name}-${index}`}
                        className="border-t text-slate-700"
                      >
                        <td className="px-3 py-2">{event.event_name}</td>
                        {isSports ? (
                          <>
                            <td className="px-3 py-2 text-right">{event.gold || 0}</td>
                            <td className="px-3 py-2 text-right">{event.silver || 0}</td>
                            <td className="px-3 py-2 text-right">{event.bronze || 0}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-center">
                              {event.placement === 1 && "🥇 1st"}
                              {event.placement === 2 && "🥈 2nd"}
                              {event.placement === 3 && "🥉 3rd"}
                              {event.placement === 4 && "4th"}
                              {event.placement === 5 && "5th"}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">{event.points}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 sm:px-6 py-3 sm:py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#191970] hover:bg-[#14144f] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#191970] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

interface StandingsData {
  visible: boolean
  last_updated: string
  standings: {
    sports: StandingsEntry[]
    socio_cultural: PointsStandingsEntry[]
  }
  champions: {
    sports: StandingsEntry[]
    socio_cultural: PointsStandingsEntry[]
  }
  breakdowns: {
    sports: Record<string, MedalEventBreakdown[]>
    socio_cultural: Record<string, any[]>
  }
}

export function IntramuralsStandings() {
  const [data, setData] = useState<StandingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeamDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/intramurals/standings")
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch standings")
        }

        if (!result.visible) {
          setData(null)
          setLoading(false)
          return
        }

        setData(result)
        setError(null)
      } catch (err) {
        console.error("Error fetching standings:", err)
        setError(err instanceof Error ? err.message : "Failed to load standings")
      } finally {
        setLoading(false)
      }
    }

    fetchStandings()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStandings, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#191970] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading standings...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return null // Don't show anything if not visible or error
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center relative">
          <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
          <span className="absolute text-white font-bold text-xs sm:text-sm top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">2</span>
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center relative">
          <Award className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
          <span className="absolute text-white font-bold text-xs sm:text-sm top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">3</span>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-400 flex items-center justify-center">
          <span className="text-white font-bold text-xs sm:text-sm">{rank}</span>
        </div>
      </div>
    )
  }

  const handleViewDetails = (entry: StandingsEntry | PointsStandingsEntry, scope: StandingsScope) => {
    if (!data) return

    const isSportsEntry = (entry: StandingsEntry | PointsStandingsEntry): entry is StandingsEntry => {
      return 'gold' in entry
    }

    const details: SelectedTeamDetails = {
      team_id: entry.team_id,
      team_name: entry.team_name,
      team_color: entry.team_color,
      team_logo: entry.team_logo,
      rank: entry.rank,
      scope,
    }

    if (scope === "sports" && isSportsEntry(entry)) {
      // Sports - show medals
      details.gold = entry.gold
      details.silver = entry.silver
      details.bronze = entry.bronze
      details.total = entry.total
      details.eventsBreakdown = data.breakdowns?.sports?.[entry.team_id] || []
    } else if (scope === "socio_cultural" && !isSportsEntry(entry)) {
      // Socio-cultural - show points
      details.total_points = entry.total_points
      details.eventsBreakdown = data.breakdowns?.socio_cultural?.[entry.team_id] || []
    }

    setSelectedTeam(details)
    setIsModalOpen(true)
  }

  const SportsMedalTable = ({
    title,
    standings,
  }: {
    title: string
    standings: StandingsEntry[]
  }) => {
    if (standings.length === 0) return null

    return (
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-[#191970] mb-3 sm:mb-4 px-2 sm:px-0">{title}</h2>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                    <TableHead className="font-bold text-[#191970] text-center w-16 sm:w-20 px-2 sm:px-4">
                      <span className="text-xs sm:text-sm">Rank</span>
                    </TableHead>
                    <TableHead className="font-bold text-[#191970] px-2 sm:px-4">
                      <span className="text-xs sm:text-sm">College</span>
                    </TableHead>
                    <TableHead className="font-bold text-[#191970] text-center px-2 sm:px-4">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <span className="text-yellow-600 text-sm sm:text-base">🥇</span>
                        <span className="text-xs sm:text-sm">Gold</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-[#191970] text-center px-2 sm:px-4">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <span className="text-gray-400 text-sm sm:text-base">🥈</span>
                        <span className="text-xs sm:text-sm">Silver</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-[#191970] text-center px-2 sm:px-4">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <span className="text-amber-700 text-sm sm:text-base">🥉</span>
                        <span className="text-xs sm:text-sm">Bronze</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-[#191970] text-center px-2 sm:px-4 w-28 sm:w-32">
                      <span className="text-xs sm:text-sm">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((entry) => (
                    <TableRow
                      key={`${title}-${entry.team_id}`}
                      className="hover:bg-slate-50 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="text-center px-2 sm:px-4">
                        {getRankIcon(entry.rank)}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          {entry.team_logo ? (
                            <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={entry.team_logo}
                                alt={entry.team_name}
                                className="w-full h-full object-cover"
                                style={{
                                  objectFit: "cover",
                                  width: "150%",
                                  height: "150%",
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0"
                              style={{
                                backgroundColor: entry.team_color || "#191970",
                              }}
                            >
                              {entry.team_name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-[#191970] text-xs sm:text-sm md:text-base truncate">
                            {entry.team_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2 sm:px-4">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-yellow-600 text-sm sm:text-base">🥇</span>
                          <span className="font-semibold text-xs sm:text-sm md:text-base">
                            {entry.gold}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2 sm:px-4">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-gray-400 text-sm sm:text-base">🥈</span>
                          <span className="font-semibold text-xs sm:text-sm md:text-base">
                            {entry.silver}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2 sm:px-4">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-amber-700 text-sm sm:text-base">🥉</span>
                          <span className="font-semibold text-xs sm:text-sm md:text-base">
                            {entry.bronze}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2 sm:px-4">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(entry, "sports")}
                          className="inline-flex items-center justify-center rounded-full border border-[#191970]/20 bg-white px-3 py-1 text-[11px] sm:text-xs font-semibold text-[#191970] hover:bg-[#191970] hover:text-white transition-colors"
                        >
                          View Details
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const SocioPointsTable = ({
    title,
    standings,
  }: {
    title: string
    standings: PointsStandingsEntry[]
  }) => {
    if (standings.length === 0) return null

    return (
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-[#191970] mb-3 sm:mb-4 px-2 sm:px-0">{title}</h2>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                    <TableHead className="font-bold text-[#191970] text-center w-16 sm:w-20 px-2 sm:px-4">
                      <span className="text-xs sm:text-sm">Rank</span>
                    </TableHead>
                    <TableHead className="font-bold text-[#191970] px-2 sm:px-4">
                      <span className="text-xs sm:text-sm">College</span>
                    </TableHead>
                    <TableHead className="font-bold text-[#191970] text-center px-2 sm:px-4">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <Award className="w-4 h-4 text-purple-600" />
                        <span className="text-xs sm:text-sm">Total Points</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-[#191970] text-center px-2 sm:px-4 w-28 sm:w-32">
                      <span className="text-xs sm:text-sm">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((entry) => (
                    <TableRow
                      key={`${title}-${entry.team_id}`}
                      className="hover:bg-slate-50 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="text-center px-2 sm:px-4">
                        {getRankIcon(entry.rank)}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          {entry.team_logo ? (
                            <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={entry.team_logo}
                                alt={entry.team_name}
                                className="w-full h-full object-cover"
                                style={{
                                  objectFit: "cover",
                                  width: "150%",
                                  height: "150%",
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0"
                              style={{
                                backgroundColor: entry.team_color || "#191970",
                              }}
                            >
                              {entry.team_name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-[#191970] text-xs sm:text-sm md:text-base truncate">
                            {entry.team_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2 sm:px-4">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-bold text-purple-600">
                            {entry.total_points}
                          </span>
                          <span className="text-xs text-slate-500">pts</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2 sm:px-4">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(entry, "socio_cultural")}
                          className="inline-flex items-center justify-center rounded-full border border-[#191970]/20 bg-white px-3 py-1 text-[11px] sm:text-xs font-semibold text-[#191970] hover:bg-[#191970] hover:text-white transition-colors"
                        >
                          View Details
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="bg-white">
      {/* Dark Blue Header with Trophy Icon */}
      <div className="py-6 sm:py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex justify-center mb-3 sm:mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/intrams.png"
                alt="Trophy"
                className="object-contain"
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto',
                  maxHeight: '300px',
                  width: 'auto'
                }}
              />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#191970] mb-2 sm:mb-3 px-2">
              Official Leaderboard
            </h1>
            <p className="text-[#191970] text-sm sm:text-base md:text-lg max-w-1xl mx-auto px-2">
              Current standings for Bukidnon State University-Main Campus Intramurals 2026. Points are updated in real-time as matches conclude.
            </p>
            {data.last_updated && (
              <div className="flex items-center justify-center space-x-2 text-[#191970] text-xs sm:text-sm mt-3 sm:mt-4 px-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="break-words">
                  Last updated: {format(new Date(data.last_updated), "MMM dd, yyyy 'at' h:mm a")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Tables */}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        {data.standings.sports.length === 0 && 
         data.standings.socio_cultural.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No standings available yet</p>
          </div>
        ) : (
          <>
            {/* Sports Medal Tally */}
            <SportsMedalTable 
              title="🏆 Sports Medal Tally" 
              standings={data.standings.sports}
            />
            
            {/* Socio-Cultural Points Tally */}
            <SocioPointsTable 
              title="🎭 Socio-Cultural Points Tally" 
              standings={data.standings.socio_cultural}
            />
          </>
        )}
      </div>

      <MedalDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        team={selectedTeam}
      />
    </section>
  )
}

