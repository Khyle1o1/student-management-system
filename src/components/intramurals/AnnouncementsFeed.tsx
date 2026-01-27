"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Award, Calendar, MapPin, Clock, Megaphone } from "lucide-react"
import { format, parseISO } from "date-fns"

interface AnnouncementContent {
  event_name: string
  category: string
  gold_team?: string | null
  silver_team?: string | null
  bronze_team?: string | null
  points_awarded?: Array<{
    team_name: string
    placement: number
    points: number
  }>
  event_date?: string | null
  location?: string | null
}

interface Announcement {
  id: string
  event_id: string
  announcement_type: 'sports_medal' | 'sociocultural_points'
  content: AnnouncementContent
  admin_id: string | null
  admin_name: string | null
  is_visible: boolean
  created_at: string
  updated_at: string
  event?: {
    id: string
    name: string
    category: string
    start_time?: string | null
    location?: string | null
  }
}

interface AnnouncementsFeedProps {
  limit?: number
  showTitle?: boolean
}

export function AnnouncementsFeed({ limit = 10, showTitle = true }: AnnouncementsFeedProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnnouncements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/intramurals/announcements?limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch announcements')
      }

      const data = await response.json()
      setAnnouncements(data.announcements || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching announcements:', err)
      setError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy • h:mm a')
    } catch {
      return 'Date not available'
    }
  }

  const formatCompactResults = (announcement: Announcement) => {
    if (announcement.announcement_type === 'sports_medal') {
      const results = []
      if (announcement.content.gold_team) results.push(`Gold: ${announcement.content.gold_team}`)
      if (announcement.content.silver_team) results.push(`Silver: ${announcement.content.silver_team}`)
      if (announcement.content.bronze_team) results.push(`Bronze: ${announcement.content.bronze_team}`)
      return results.join(', ')
    } else {
      // Socio-cultural points
      if (announcement.content.points_awarded) {
        return announcement.content.points_awarded
          .map(p => `${p.team_name} (${p.points} pts)`)
          .join(', ')
      }
    }
    return ''
  }

  const getMedalEmoji = (medal: string) => {
    switch (medal) {
      case 'gold': return '🥇'
      case 'silver': return '🥈'
      case 'bronze': return '🥉'
      default: return '🏅'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Latest Results Feed</h2>
          </div>
        )}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-[#131c2e] border-white/10 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-white/10 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-[#131c2e] border-white/10">
        <CardContent className="p-6 text-center">
          <p className="text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Latest Results Feed</h2>
          </div>
        )}
        <Card className="bg-[#131c2e] border-white/10">
          <CardContent className="p-8 text-center">
            <Megaphone className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No announcements yet. Check back soon for updates!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="h-4 w-4 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Latest Results Feed</h2>
          {announcements.length > 0 && (
            <Badge variant="secondary" className="ml-auto bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5">
              {announcements.length} New
            </Badge>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {announcements.map((announcement) => (
          <div 
            key={announcement.id} 
            className="bg-[#0f1729]/60 border border-white/5 rounded-md px-3 py-2 hover:bg-[#0f1729]/80 transition-colors"
          >
            {/* Single Compact Line */}
            <div className="flex flex-col gap-1">
              {/* Main announcement line */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base">
                  {announcement.announcement_type === 'sports_medal' ? '🏅' : '🎭'}
                </span>
                <span className="font-medium text-white">
                  {announcement.content.event_name}
                </span>
                <span className="text-gray-500">—</span>
                <span className="text-gray-300 text-xs flex-1 truncate">
                  {formatCompactResults(announcement)}
                </span>
              </div>
              
              {/* Timestamp line */}
              <div className="flex items-center gap-2 text-xs text-gray-500 pl-6">
                <Clock className="h-3 w-3" />
                <span>{formatDate(announcement.created_at)}</span>
                {announcement.content.location && (
                  <>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    <span>{announcement.content.location}</span>
                  </>
                )}
               
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
