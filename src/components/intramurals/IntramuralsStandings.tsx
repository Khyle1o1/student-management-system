"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Clock, TrendingUp } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"

interface StandingsEntry {
  rank: number
  team_id: string
  team_name: string
  team_color: string | null
  gold: number
  silver: number
  bronze: number
  total: number
}

interface StandingsData {
  visible: boolean
  last_updated: string
  standings: {
    sports: StandingsEntry[]
    socio_cultural: StandingsEntry[]
    overall: StandingsEntry[]
  }
}

export function IntramuralsStandings() {
  const [data, setData] = useState<StandingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1">
          <Trophy className="w-3 h-3 mr-1" />
          1st
        </Badge>
      )
    }
    if (rank === 2) {
      return (
        <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white px-3 py-1">
          <Medal className="w-3 h-3 mr-1" />
          2nd
        </Badge>
      )
    }
    if (rank === 3) {
      return (
        <Badge className="bg-gradient-to-r from-amber-600 to-amber-800 text-white px-3 py-1">
          <Award className="w-3 h-3 mr-1" />
          3rd
        </Badge>
      )
    }
    return <span className="text-slate-600 font-semibold">#{rank}</span>
  }

  const getRowClassName = (rank: number) => {
    if (rank === 1) {
      return "bg-gradient-to-r from-yellow-50 to-yellow-100/50 border-l-4 border-yellow-400 animate-pulse"
    }
    if (rank === 2) {
      return "bg-gradient-to-r from-gray-50 to-gray-100/50 border-l-4 border-gray-400"
    }
    if (rank === 3) {
      return "bg-gradient-to-r from-amber-50 to-amber-100/50 border-l-4 border-amber-600"
    }
    return "hover:bg-slate-50 transition-colors"
  }

  const StandingsTable = ({ 
    title, 
    standings, 
    icon 
  }: { 
    title: string
    standings: StandingsEntry[]
    icon: React.ReactNode
  }) => {
    // Prepare chart data
    const chartData = standings.slice(0, 10).map((entry) => ({
      name: entry.team_name.length > 15 
        ? entry.team_name.substring(0, 15) + "..." 
        : entry.team_name,
      Gold: entry.gold,
      Silver: entry.silver,
      Bronze: entry.bronze,
      Total: entry.total,
    }))

    return (
      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-[#191970] to-[#191970]/90 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon}
              <div>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription className="text-white/80">
                  Medal Count Standings
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {standings.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No standings available yet</p>
            </div>
          ) : (
            <>
              {/* Standings Table */}
              <div className="overflow-x-auto mb-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100">
                      <TableHead className="font-bold">Rank</TableHead>
                      <TableHead className="font-bold">Team</TableHead>
                      <TableHead className="font-bold text-center">
                        <span className="text-yellow-600">🥇</span> Gold
                      </TableHead>
                      <TableHead className="font-bold text-center">
                        <span className="text-gray-400">🥈</span> Silver
                      </TableHead>
                      <TableHead className="font-bold text-center">
                        <span className="text-amber-700">🥉</span> Bronze
                      </TableHead>
                      <TableHead className="font-bold text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((entry, index) => (
                      <TableRow
                        key={entry.team_id}
                        className={getRowClassName(entry.rank)}
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                      >
                        <TableCell className="font-semibold">
                          {getRankBadge(entry.rank)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {entry.team_color && (
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: entry.team_color }}
                              />
                            )}
                            <span className="font-medium">{entry.team_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-yellow-600">
                          {entry.gold}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-gray-500">
                          {entry.silver}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-amber-700">
                          {entry.bronze}
                        </TableCell>
                        <TableCell className="text-center font-bold text-[#191970]">
                          {entry.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Bar Chart */}
              {chartData.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-[#191970]" />
                    Medal Distribution (Top 10)
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Gold" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Silver" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Bronze" fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="py-16 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 space-y-4">
          <Badge className="bg-gradient-to-r from-[#191970] to-[#191970]/80 text-white px-6 py-3 rounded-full font-semibold text-sm">
            🏁 Intramurals 2025
          </Badge>
          <h2 className="text-4xl font-bold text-[#191970]">
            Official Medal Tally
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Track the latest standings across Sports Events and Socio-Cultural Events. 
            Rankings are based on medal counts (Gold, Silver, Bronze).
          </p>
          {data.last_updated && (
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>
                Last updated: {format(new Date(data.last_updated), "MMM dd, yyyy 'at' h:mm a")}
              </span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Sports Events Standing */}
          <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: "0ms" }}>
            <StandingsTable
              title="🏆 Sports Events"
              standings={data.standings.sports}
              icon={<Trophy className="w-6 h-6" />}
            />
          </div>

          {/* Socio-Cultural Events Standing */}
          <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <StandingsTable
              title="🎭 Socio-Cultural Events"
              standings={data.standings.socio_cultural}
              icon={<Award className="w-6 h-6" />}
            />
          </div>

          {/* Overall Standing */}
          <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <StandingsTable
              title="🥇 Overall Standing"
              standings={data.standings.overall}
              icon={<Medal className="w-6 h-6" />}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </section>
  )
}

