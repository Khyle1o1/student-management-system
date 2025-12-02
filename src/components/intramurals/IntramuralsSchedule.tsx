"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, Trophy } from "lucide-react"
import { format } from "date-fns"

interface PublicMatch {
  id: string
  match_time: string
  location: string | null
  status: string
  event: { id: string; name: string; category: "sports" | "socio-cultural" }
  team1: { id: string; name: string }
  team2: { id: string; name: string }
}

interface PublicEvent {
  id: string
  name: string
  category: string
  start_time: string
  location: string | null
}

interface ScheduleResponse {
  visible: boolean
  match_schedule: PublicMatch[]
  event_schedule: PublicEvent[]
}

export function IntramuralsSchedule() {
  const [data, setData] = useState<ScheduleResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/intramurals/public/schedule")
        const json = await res.json()
        if (!res.ok || !json.visible) {
          setData(null)
        } else {
          setData(json)
        }
      } catch (error) {
        console.error("Error fetching intramurals schedule:", error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
    const interval = setInterval(fetchSchedule, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return null
  }

  if (!data) {
    return null
  }

  const { match_schedule, event_schedule } = data

  if (match_schedule.length === 0 && event_schedule.length === 0) {
    return null
  }

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-12 border-t border-slate-100">
      <div className="container mx-auto px-4 space-y-8">
        {/* Match Schedule - event card style */}
        {match_schedule.length > 0 && (
          <Card className="bg-white border border-slate-200 shadow-lg rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#191970] flex items-center justify-center text-white shadow-md">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-[#191970]">
                      Upcoming Matches
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600">
                      Cheer for your department in the latest intramurals sports fixtures
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 py-6">
              {match_schedule.map((match) => {
                const date = new Date(match.match_time)
                return (
                  <div
                    key={match.id}
                    className="rounded-2xl bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {/* Banner strip */}
                    <div className="h-20 bg-gradient-to-r from-[#191970] via-[#1e3a8a] to-[#0f172a] relative overflow-hidden">
                      <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_#fff,_transparent_60%)]" />
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                            {format(date, "EEE, MMM dd")}
                          </p>
                          <h3 className="font-bold text-slate-900 line-clamp-2">
                            {match.event.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-sm font-semibold text-slate-800">
                        <Users className="w-4 h-4 text-[#191970]" />
                        <span className="truncate max-w-[40%] text-right">{match.team1.name}</span>
                        <span className="text-red-500 mx-1">VS</span>
                        <span className="truncate max-w-[40%] text-left">{match.team2.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span>{format(date, "h:mm a")}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4 text-slate-500" />
                          <span>{match.location || "TBA"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <button
                        className="w-full rounded-full bg-[#191970] text-white text-xs font-semibold py-2 shadow-md hover:shadow-lg hover:bg-[#151554] transition-all"
                      >
                        View Match Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Event Schedule - event card style */}
        {event_schedule.length > 0 && (
          <Card className="bg-white border border-slate-200 shadow-lg rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#191970] flex items-center justify-center text-white shadow-md">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-[#191970]">
                    Event Schedule
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    Socio-cultural events, ceremonies, and special intramurals activities
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 py-6">
              {event_schedule.map((event) => {
                const date = new Date(event.start_time)
                return (
                  <div
                    key={event.id}
                    className="rounded-2xl bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {/* Banner strip */}
                    <div className="h-20 bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#4b1fa8] relative overflow-hidden">
                      <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_#fff,_transparent_60%)]" />
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 line-clamp-2 max-w-[75%]">
                          {event.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {format(date, "MMM dd")}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>{format(date, "EEE • h:mm a")}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>{event.location || "Location TBA"}</span>
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <button
                        className="w-full rounded-full bg-[#191970] text-white text-xs font-semibold py-2 shadow-md hover:shadow-lg hover:bg-[#151554] transition-all"
                      >
                        View Event Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}


