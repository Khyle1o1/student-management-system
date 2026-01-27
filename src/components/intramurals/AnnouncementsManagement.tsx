"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Megaphone, Eye, EyeOff, Trash2, RefreshCw, Settings, Trophy, Award } from "lucide-react"
import { toast } from "react-hot-toast"
import { format, parseISO } from "date-fns"
import Swal from "sweetalert2"

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
  }
}

export function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [autoAnnouncementsEnabled, setAutoAnnouncementsEnabled] = useState(true)
  const [approvalRequired, setApprovalRequired] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
    fetchSettings()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/intramurals/admin/announcements')
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements || [])
      } else {
        toast.error('Failed to fetch announcements')
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
      toast.error('Error loading announcements')
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/intramurals/admin/announcements/settings')
      if (response.ok) {
        const data = await response.json()
        setAutoAnnouncementsEnabled(data.auto_announcements_enabled ?? true)
        setApprovalRequired(data.announcement_approval_required ?? false)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const updateSettings = async (setting: string, value: boolean) => {
    try {
      setSettingsLoading(true)
      const response = await fetch('/api/intramurals/admin/announcements/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [setting]: value })
      })

      if (response.ok) {
        if (setting === 'auto_announcements_enabled') {
          setAutoAnnouncementsEnabled(value)
        } else if (setting === 'announcement_approval_required') {
          setApprovalRequired(value)
        }
        toast.success('Settings updated successfully')
      } else {
        toast.error('Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Error updating settings')
    } finally {
      setSettingsLoading(false)
    }
  }

  const toggleVisibility = async (announcementId: string, currentVisibility: boolean) => {
    try {
      const response = await fetch('/api/intramurals/admin/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_id: announcementId,
          is_visible: !currentVisibility
        })
      })

      if (response.ok) {
        toast.success(`Announcement ${!currentVisibility ? 'shown' : 'hidden'}`)
        fetchAnnouncements()
      } else {
        toast.error('Failed to update announcement')
      }
    } catch (error) {
      console.error('Error updating announcement:', error)
      toast.error('Error updating announcement')
    }
  }

  const deleteAnnouncement = async (announcementId: string) => {
    const result = await Swal.fire({
      title: 'Delete Announcement?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/intramurals/admin/announcements?id=${announcementId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          toast.success('Announcement deleted')
          fetchAnnouncements()
        } else {
          toast.error('Failed to delete announcement')
        }
      } catch (error) {
        console.error('Error deleting announcement:', error)
        toast.error('Error deleting announcement')
      }
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy • h:mm a')
    } catch {
      return 'Date not available'
    }
  }

  return (
    <div className="space-y-4">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Announcement Settings</CardTitle>
          </div>
          <CardDescription>
            Configure how announcements are generated and displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="auto-announcements" className="text-base font-medium">
                Auto-Generate Announcements
              </Label>
              <p className="text-sm text-gray-500">
                Automatically create announcements when medals or points are assigned
              </p>
            </div>
            <Switch
              id="auto-announcements"
              checked={autoAnnouncementsEnabled}
              onCheckedChange={(checked) => updateSettings('auto_announcements_enabled', checked)}
              disabled={settingsLoading}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="approval-required" className="text-base font-medium">
                Require Approval Before Publishing
              </Label>
              <p className="text-sm text-gray-500">
                New announcements will be hidden until manually approved by admin
              </p>
            </div>
            <Switch
              id="approval-required"
              checked={approvalRequired}
              onCheckedChange={(checked) => updateSettings('announcement_approval_required', checked)}
              disabled={settingsLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Announcements List Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              <CardTitle>Announcements ({announcements.length})</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnnouncements}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Manage all automatically generated result announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No announcements yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Announcements will appear here when medals or points are assigned
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Posted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {announcement.announcement_type === 'sports_medal' ? (
                            <>
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">Sports</span>
                            </>
                          ) : (
                            <>
                              <Award className="h-4 w-4 text-purple-500" />
                              <span className="text-sm">Socio-Cultural</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{announcement.content.event_name}</p>
                          <p className="text-xs text-gray-500">{announcement.content.category}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {announcement.announcement_type === 'sports_medal' ? (
                            <>
                              {announcement.content.gold_team && (
                                <div>🥇 {announcement.content.gold_team}</div>
                              )}
                              {announcement.content.silver_team && (
                                <div>🥈 {announcement.content.silver_team}</div>
                              )}
                              {announcement.content.bronze_team && (
                                <div>🥉 {announcement.content.bronze_team}</div>
                              )}
                            </>
                          ) : (
                            <>
                              {announcement.content.points_awarded?.slice(0, 3).map((point, idx) => (
                                <div key={idx}>
                                  {point.placement}. {point.team_name} - {point.points} pts
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {announcement.admin_name || 'System'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">
                          {formatDate(announcement.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={announcement.is_visible ? 'default' : 'secondary'}
                          className={announcement.is_visible ? 'bg-green-500' : 'bg-gray-500'}
                        >
                          {announcement.is_visible ? 'Visible' : 'Hidden'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVisibility(announcement.id, announcement.is_visible)}
                            title={announcement.is_visible ? 'Hide' : 'Show'}
                          >
                            {announcement.is_visible ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAnnouncement(announcement.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
