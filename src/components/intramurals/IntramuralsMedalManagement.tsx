"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Trophy,
  Users,
  Calendar,
  Award,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Settings,
  Eye,
  RefreshCw,
  Medal,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import Swal from "sweetalert2"

interface Team {
  id: string
  name: string
  logo: string | null
  color: string | null
  created_at: string
  updated_at: string
}

interface Event {
  id: string
  name: string
  category: "sports" | "socio-cultural"
  start_time?: string | null
  location?: string | null
  created_at: string
  updated_at: string
  medal_awards?: Array<{
    id: string
    gold_team_id: string | null
    silver_team_id: string | null
    bronze_team_id: string | null
    gold_team?: { id: string; name: string } | null
    silver_team?: { id: string; name: string } | null
    bronze_team?: { id: string; name: string } | null
  }>
}

interface Settings {
  id: string
  is_visible: boolean
  last_updated: string
}

export function IntramuralsMedalManagement() {
  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  // Team management
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [teamForm, setTeamForm] = useState({ name: "", logo: "", color: "" })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Event management
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [eventForm, setEventForm] = useState({
    name: "",
    category: "sports" as "sports" | "socio-cultural",
    start_time: "",
    location: "",
  })

  // Medal assignment
  const [showMedalDialog, setShowMedalDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [medalForm, setMedalForm] = useState({
    gold_team_id: "",
    silver_team_id: "",
    bronze_team_id: "",
  })

  // Match schedule
  interface Match {
    id: string
    event_id: string
    team1_id: string
    team2_id: string
    match_time: string
    location: string | null
    status: "scheduled" | "in_progress" | "completed" | "cancelled" | "pending"
    winner_id?: string | null
    team1_score?: number | null
    team2_score?: number | null
    event?: { id: string; name: string; category: "sports" | "socio-cultural" }
    team1?: { id: string; name: string }
    team2?: { id: string; name: string }
  }

  const [matches, setMatches] = useState<Match[]>([])
  const [showMatchDialog, setShowMatchDialog] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [matchForm, setMatchForm] = useState({
    event_id: "",
    team1_id: "",
    team2_id: "",
    match_time: "",
    location: "",
  })

  // Match scoring
  const [showScoreDialog, setShowScoreDialog] = useState(false)
  const [scoringMatch, setScoringMatch] = useState<Match | null>(null)
  const [scoreForm, setScoreForm] = useState({
    team1_score: "",
    team2_score: "",
    winner_id: "",
  })


  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch("/api/intramurals/admin/teams")
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
      toast.error("Failed to fetch teams")
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/intramurals/admin/events")
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      toast.error("Failed to fetch events")
    }
  }, [])


  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/intramurals/admin/settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    }
  }, [])

  const fetchMatches = useCallback(async () => {
    try {
      const response = await fetch("/api/intramurals/admin/matches")
      if (response.ok) {
        const data = await response.json()
        setMatches(data.matches || [])
      }
    } catch (error) {
      console.error("Error fetching matches:", error)
      toast.error("Failed to fetch matches")
    }
  }, [])

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true)
      await Promise.all([fetchTeams(), fetchEvents(), fetchSettings(), fetchMatches()])
    } finally {
      setLoading(false)
    }
  }, [fetchTeams, fetchEvents, fetchSettings, fetchMatches])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const handleLogoUpload = async (file: File) => {
    if (!file) {
      console.log('No file provided')
      return
    }

    console.log('File selected:', file.name, file.type, file.size)

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file)
    setLogoPreview(previewUrl)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      setLogoPreview(null)
      URL.revokeObjectURL(previewUrl)
      return
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      toast.error(`File size (${fileSizeMB}MB) exceeds the 10MB limit`)
      setLogoPreview(null)
      URL.revokeObjectURL(previewUrl)
      return
    }
    
    console.log('File validation passed, starting upload...')

    setUploadingLogo(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Uploading file...')

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status)

      let data
      try {
        data = await response.json()
        console.log('Response data:', data)
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
        const text = await response.text()
        console.error('Response text:', text)
        throw new Error('Failed to parse server response')
      }

      if (response.ok) {
        // Revoke the preview URL and use the uploaded URL
        URL.revokeObjectURL(previewUrl)
        setTeamForm({ ...teamForm, logo: data.url })
        setLogoPreview(data.url)
        toast.success('Logo uploaded successfully')
      } else {
        const errorMessage = data?.error || 'Failed to upload logo'
        console.error('Upload error:', errorMessage, data)
        toast.error(`Error uploading logo: ${errorMessage}`)
        // Keep preview for now
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo. Please try again.')
      // Keep preview for now
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoRemove = () => {
    setTeamForm({ ...teamForm, logo: "" })
    setLogoPreview(null)
  }

  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) {
      await Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Team name is required",
        confirmButtonColor: "#dc2626",
      })
      return
    }

    // Show loading alert
    Swal.fire({
      title: editingTeam ? "Updating team..." : "Creating team...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const url = editingTeam
        ? `/api/intramurals/admin/teams/${editingTeam.id}`
        : "/api/intramurals/admin/teams"
      const method = editingTeam ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamForm),
      })

      Swal.close()

      if (response.ok) {
        setShowTeamDialog(false)
        setEditingTeam(null)
        setTeamForm({ name: "", logo: "", color: "" })
        setLogoPreview(null)
        fetchTeams()

        await Swal.fire({
          icon: "success",
          title: editingTeam ? "Team updated!" : "Team created!",
          text: editingTeam 
            ? `"${teamForm.name}" has been updated successfully.`
            : `"${teamForm.name}" has been created successfully.`,
          confirmButtonColor: "#16a34a",
        })
      } else {
        const error = await response.json()
        await Swal.fire({
          icon: "error",
          title: "Failed to save team",
          text: error.error || "An error occurred while saving the team.",
          confirmButtonColor: "#dc2626",
        })
      }
    } catch (error) {
      console.error("Error saving team:", error)
      Swal.close()
      await Swal.fire({
        icon: "error",
        title: "Unexpected error",
        text: "Failed to save team. Please try again.",
        confirmButtonColor: "#dc2626",
      })
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    const teamName = team?.name || "this team"

    const result = await Swal.fire({
      title: "Delete this team?",
      text: `"${teamName}" and all its medal awards will be permanently removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete Team",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    // Show loading alert
    Swal.fire({
      title: "Deleting team...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const response = await fetch(`/api/intramurals/admin/teams/${teamId}`, {
        method: "DELETE",
      })

      Swal.close()

      if (response.ok) {
        fetchTeams()
        fetchEvents() // Refresh events to update medal awards

        await Swal.fire({
          icon: "success",
          title: "Team deleted",
          text: `"${teamName}" has been removed successfully.`,
          confirmButtonColor: "#0f172a",
        })
      } else {
        await Swal.fire({
          icon: "error",
          title: "Failed to delete team",
          text: "An error occurred while deleting the team.",
          confirmButtonColor: "#dc2626",
        })
      }
    } catch (error) {
      console.error("Error deleting team:", error)
      Swal.close()
      await Swal.fire({
        icon: "error",
        title: "Unexpected error",
        text: "Failed to delete team. Please try again.",
        confirmButtonColor: "#dc2626",
      })
    }
  }

  const handleSaveEvent = async () => {
    if (!eventForm.name.trim()) {
      toast.error("Event name is required")
      return
    }

    try {
      const url = editingEvent
        ? `/api/intramurals/admin/events/${editingEvent.id}`
        : "/api/intramurals/admin/events"
      const method = editingEvent ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          start_time: eventForm.start_time ? new Date(eventForm.start_time).toISOString() : null,
          location: eventForm.location || null,
        }),
      })

      if (response.ok) {
        toast.success(editingEvent ? "Event updated successfully" : "Event created successfully")
        setShowEventDialog(false)
        setEditingEvent(null)
        setEventForm({ name: "", category: "sports", start_time: "", location: "" })
        fetchEvents()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save event")
      }
    } catch (error) {
      console.error("Error saving event:", error)
      toast.error("Failed to save event")
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event? This will also delete all medal awards for this event.")) {
      return
    }

    try {
      const response = await fetch(`/api/intramurals/admin/events/${eventId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Event deleted successfully")
        fetchEvents()
      } else {
        toast.error("Failed to delete event")
      }
    } catch (error) {
      console.error("Error deleting event:", error)
      toast.error("Failed to delete event")
    }
  }

  const handleAssignMedals = async () => {
    if (!selectedEvent) return

    try {
      const response = await fetch("/api/intramurals/admin/medals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          gold_team_id: medalForm.gold_team_id || null,
          silver_team_id: medalForm.silver_team_id || null,
          bronze_team_id: medalForm.bronze_team_id || null,
        }),
      })

      if (response.ok) {
        toast.success("Medals assigned successfully")
        setShowMedalDialog(false)
        setSelectedEvent(null)
        setMedalForm({ gold_team_id: "", silver_team_id: "", bronze_team_id: "" })
        fetchEvents()
        fetchSettings() // Update last_updated
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to assign medals")
      }
    } catch (error) {
      console.error("Error assigning medals:", error)
      toast.error("Failed to assign medals")
    }
  }

  const handleToggleVisibility = async (isVisible: boolean) => {
    // Show sweet alert before toggling
    const result = await Swal.fire({
      title: isVisible ? 'Enable Display on Main Page?' : 'Disable Display on Main Page?',
      text: isVisible 
        ? 'The intramurals standings will be visible to all visitors on the main page.'
        : 'The intramurals standings will be hidden from the main page.',
      icon: isVisible ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: isVisible ? '#3b82f6' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isVisible ? 'Yes, Enable It!' : 'Yes, Disable It!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-lg px-4 py-2',
        cancelButton: 'rounded-lg px-4 py-2',
      },
    })

    if (!result.isConfirmed) {
      return // User cancelled, don't proceed with the toggle
    }
    try {
      const response = await fetch("/api/intramurals/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: isVisible }),
      })

      if (response.ok) {
        // Show success sweet alert
        await Swal.fire({
          title: isVisible ? 'Enabled Successfully!' : 'Disabled Successfully!',
          text: isVisible 
            ? 'The intramurals standings are now visible on the main page.'
            : 'The intramurals standings are now hidden from the main page.',
          icon: 'success',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'Got it!',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-lg px-4 py-2',
          },
        })
        toast.success(isVisible ? "Standings are now visible on main page" : "Standings hidden from main page")
        fetchSettings()
      } else {
        await Swal.fire({
          title: 'Error!',
          text: 'Failed to update display settings. Please try again.',
          icon: 'error',
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-lg px-4 py-2',
          },
        })
        toast.error("Failed to update settings")
      }
    } catch (error) {
      console.error("Error updating settings:", error)
      await Swal.fire({
        title: 'Error!',
        text: 'An error occurred while updating settings. Please try again.',
        icon: 'error',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-lg px-4 py-2',
        },
      })
      toast.error("Failed to update settings")
    }
  }

  const openMedalDialog = (event: Event) => {
    setSelectedEvent(event)
    const medalAward = event.medal_awards?.[0]
    setMedalForm({
      gold_team_id: medalAward?.gold_team_id || "",
      silver_team_id: medalAward?.silver_team_id || "",
      bronze_team_id: medalAward?.bronze_team_id || "",
    })
    setShowMedalDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#191970] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Intramurals Medal Management</h2>
          <p className="text-muted-foreground">
            Manage teams, events, and medal assignments for Intramurals 2025
          </p>
        </div>
        <Button onClick={fetchAllData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Display Settings
          </CardTitle>
          <CardDescription>
            Control whether standings are visible on the main public page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="visibility-toggle" className="text-base font-medium">
                Display on Main Page
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {settings?.is_visible
                  ? "Standings are currently visible to the public"
                  : "Standings are hidden from the public"}
              </p>
              {settings?.last_updated && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {format(new Date(settings.last_updated), "MMM dd, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
            <Switch
              id="visibility-toggle"
              checked={settings?.is_visible || false}
              onCheckedChange={handleToggleVisibility}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">
            <Users className="mr-2 h-4 w-4" />
            Teams ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="mr-2 h-4 w-4" />
            Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="medals">
            <Medal className="mr-2 h-4 w-4" />
            Medal Assignment
          </TabsTrigger>
          <TabsTrigger value="matches">
            <Calendar className="mr-2 h-4 w-4" />
            Match Schedule
          </TabsTrigger>
          <TabsTrigger value="event-schedule">
            <Calendar className="mr-2 h-4 w-4" />
            Event Schedule
          </TabsTrigger>
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>Add, edit, or remove departments/teams</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingTeam(null)
                  setTeamForm({ name: "", logo: "", color: "" })
                  setLogoPreview(null)
                  setShowTeamDialog(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No teams yet. Click &quot;Add Team&quot; to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          {team.color && (
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-6 h-6 rounded-full border"
                                style={{ backgroundColor: team.color }}
                              />
                              <span className="text-sm">{team.color}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(team.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTeam(team)
                                setTeamForm({
                                  name: team.name,
                                  logo: team.logo || "",
                                  color: team.color || "",
                                })
                                setLogoPreview(team.logo || null)
                                setShowTeamDialog(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Event Management</CardTitle>
                  <CardDescription>Add or edit events, specifying Sports or Socio-Cultural category</CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingEvent(null)
                  setEventForm({ name: "", category: "sports", start_time: "", location: "" })
                  setShowEventDialog(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Medals Assigned</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No events yet. Click &quot;Add Event&quot; to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => {
                      const medalAward = event.medal_awards?.[0]
                      const hasMedals = medalAward && (
                        medalAward.gold_team_id ||
                        medalAward.silver_team_id ||
                        medalAward.bronze_team_id
                      )

                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.name}</TableCell>
                          <TableCell>
                            <Badge variant={event.category === "sports" ? "default" : "secondary"}>
                              {event.category === "sports" ? "🏆 Sports" : "🎭 Socio-Cultural"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {hasMedals ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Award className="w-3 h-3 mr-1" />
                                Assigned
                              </Badge>
                            ) : (
                              <Badge variant="outline">Not Assigned</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openMedalDialog(event)}
                              >
                                <Medal className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingEvent(event)
                                  setEventForm({
                                    name: event.name,
                                    category: event.category,
                                    start_time: event.start_time
                                      ? new Date(event.start_time).toISOString().slice(0, 16)
                                      : "",
                                    location: event.location || "",
                                  })
                                  setShowEventDialog(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medal Assignment Tab */}
        <TabsContent value="medals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medal Assignment</CardTitle>
              <CardDescription>
                Assign Gold, Silver, and Bronze winners for each event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">🥇 Gold</TableHead>
                    <TableHead className="text-center">🥈 Silver</TableHead>
                    <TableHead className="text-center">🥉 Bronze</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No events available. Create events first.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => {
                      const medalAward = event.medal_awards?.[0]
                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.name}</TableCell>
                          <TableCell>
                            <Badge variant={event.category === "sports" ? "default" : "secondary"}>
                              {event.category === "sports" ? "🏆 Sports" : "🎭 Socio-Cultural"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {medalAward?.gold_team?.name || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {medalAward?.silver_team?.name || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {medalAward?.bronze_team?.name || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openMedalDialog(event)}
                            >
                              <Medal className="mr-2 h-4 w-4" />
                              Assign
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Match Schedule Tab */}
        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Match Schedule</CardTitle>
                  <CardDescription>
                    Create and manage match schedules for sports events
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingMatch(null)
                    setMatchForm({
                      event_id: "",
                      team1_id: "",
                      team2_id: "",
                      match_time: "",
                      location: "",
                    })
                    setShowMatchDialog(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Match
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Match Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No matches scheduled yet. Click &quot;Add Match&quot; to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell className="font-medium">
                          {match.event?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{match.team1?.name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span>{match.team2?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(match.match_time), "MMM dd, yyyy 'at' h:mm a")}
                        </TableCell>
                        <TableCell>{match.location || "TBA"}</TableCell>
                        <TableCell className="capitalize text-sm">
                          {match.status === "pending" ? "Scheduled" : match.status.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setScoringMatch(match)
                                setScoreForm({
                                  team1_score: match.team1_score?.toString() || "",
                                  team2_score: match.team2_score?.toString() || "",
                                  winner_id: match.winner_id || "",
                                })
                                setShowScoreDialog(true)
                              }}
                            >
                              Add Score
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingMatch(match)
                                setMatchForm({
                                  event_id: match.event_id,
                                  team1_id: match.team1_id,
                                  team2_id: match.team2_id,
                                  match_time: match.match_time
                                    ? new Date(match.match_time).toISOString().slice(0, 16)
                                    : "",
                                  location: match.location || "",
                                })
                                setShowMatchDialog(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Schedule Tab (non-match events) */}
        <TabsContent value="event-schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Schedule</CardTitle>
              <CardDescription>
                Set schedule and locations for non-match intramurals events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events
                    .filter((event) => event.category !== "sports")
                    .map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">🎭 Socio-Cultural</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.start_time
                            ? format(new Date(event.start_time), "MMM dd, yyyy 'at' h:mm a")
                            : "Not set"}
                        </TableCell>
                        <TableCell>{event.location || "Not set"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingEvent(event)
                              setEventForm({
                                name: event.name,
                                category: event.category,
                                start_time: event.start_time
                                  ? new Date(event.start_time).toISOString().slice(0, 16)
                                  : "",
                                location: event.location || "",
                              })
                              setShowEventDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Team Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Add New Team"}</DialogTitle>
            <DialogDescription>
              {editingTeam ? "Update team information" : "Create a new team/department"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="team-name">Team Name *</Label>
              <Input
                id="team-name"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                placeholder="e.g., CAS, CBA, CED"
              />
            </div>
            <div>
              <Label htmlFor="team-logo">Team Logo (Optional)</Label>
              <div className="space-y-2">
                <Input
                  id="team-logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleLogoUpload(file)
                    }
                  }}
                  disabled={uploadingLogo}
                  className="cursor-pointer"
                />
                {uploadingLogo && (
                  <p className="text-sm text-muted-foreground">Uploading logo...</p>
                )}
                {(logoPreview || teamForm.logo) && (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview || teamForm.logo || ""}
                      alt="Team logo preview"
                      className="w-32 h-32 rounded-full border-2 border-slate-200"
                      style={{ objectFit: 'cover', width: '150px', height: '150px' }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleLogoRemove}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="team-color">Color (Optional)</Label>
              <div className="flex space-x-2">
                <Input
                  id="team-color"
                  value={teamForm.color}
                  onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                  placeholder="#191970"
                  className="flex-1"
                />
                <input
                  type="color"
                  value={teamForm.color || "#191970"}
                  onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTeamDialog(false)
                setLogoPreview(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTeam}>
              <Save className="mr-2 h-4 w-4" />
              {editingTeam ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Update event information" : "Create a new event"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="event-name">Event Name *</Label>
              <Input
                id="event-name"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                placeholder="e.g., Basketball, Vocal Solo"
              />
            </div>
            <div>
              <Label htmlFor="event-category">Category *</Label>
              <Select
                value={eventForm.category}
                onValueChange={(value: "sports" | "socio-cultural") =>
                  setEventForm({ ...eventForm, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sports">🏆 Sports</SelectItem>
                  <SelectItem value="socio-cultural">🎭 Socio-Cultural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="event-start-time">Date &amp; Time (Optional)</Label>
              <Input
                id="event-start-time"
                type="datetime-local"
                value={eventForm.start_time}
                onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="event-location">Location (Optional)</Label>
              <Input
                id="event-location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="e.g., Main Gym, Auditorium"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEvent}>
              <Save className="mr-2 h-4 w-4" />
              {editingEvent ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medal Assignment Dialog */}
      <Dialog open={showMedalDialog} onOpenChange={setShowMedalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Medals - {selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              Select Gold, Silver, and Bronze winners for this event
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="gold-team" className="flex items-center">
                <span className="text-yellow-600 mr-2">🥇</span> Gold Winner
              </Label>
              <Select
                value={medalForm.gold_team_id || undefined}
                onValueChange={(value) =>
                  setMedalForm({ ...medalForm, gold_team_id: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gold winner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="silver-team" className="flex items-center">
                <span className="text-gray-400 mr-2">🥈</span> Silver Winner
              </Label>
              <Select
                value={medalForm.silver_team_id || undefined}
                onValueChange={(value) =>
                  setMedalForm({ ...medalForm, silver_team_id: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select silver winner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bronze-team" className="flex items-center">
                <span className="text-amber-700 mr-2">🥉</span> Bronze Winner
              </Label>
              <Select
                value={medalForm.bronze_team_id || undefined}
                onValueChange={(value) =>
                  setMedalForm({ ...medalForm, bronze_team_id: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bronze winner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMedalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignMedals}>
              <Save className="mr-2 h-4 w-4" />
              Save Medals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMatch ? "Edit Match" : "Add New Match"}</DialogTitle>
            <DialogDescription>
              {editingMatch
                ? "Update match schedule and details"
                : "Create a new match between two teams"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="match-event">Event *</Label>
              <Select
                value={matchForm.event_id}
                onValueChange={(value) => setMatchForm({ ...matchForm, event_id: value })}
              >
                <SelectTrigger id="match-event">
                  <SelectValue placeholder="Select sports event" />
                </SelectTrigger>
                <SelectContent>
                  {events
                    .filter((event) => event.category === "sports")
                    .map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="match-team1">Team 1 *</Label>
                <Select
                  value={matchForm.team1_id}
                  onValueChange={(value) => setMatchForm({ ...matchForm, team1_id: value })}
                >
                  <SelectTrigger id="match-team1">
                    <SelectValue placeholder="Select first team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="match-team2">Team 2 *</Label>
                <Select
                  value={matchForm.team2_id}
                  onValueChange={(value) => setMatchForm({ ...matchForm, team2_id: value })}
                >
                  <SelectTrigger id="match-team2">
                    <SelectValue placeholder="Select second team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="match-time">Match Date &amp; Time *</Label>
              <Input
                id="match-time"
                type="datetime-local"
                value={matchForm.match_time}
                onChange={(e) => setMatchForm({ ...matchForm, match_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="match-location">Location (Optional)</Label>
              <Input
                id="match-location"
                value={matchForm.location}
                onChange={(e) => setMatchForm({ ...matchForm, location: e.target.value })}
                placeholder="e.g., Covered Court, Main Gym"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMatchDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!matchForm.event_id || !matchForm.team1_id || !matchForm.team2_id || !matchForm.match_time) {
                  toast.error("Event, both teams, and match time are required")
                  return
                }
                if (matchForm.team1_id === matchForm.team2_id) {
                  toast.error("Teams must be different")
                  return
                }

                try {
                  const url = editingMatch
                    ? `/api/intramurals/admin/matches/${editingMatch.id}`
                    : "/api/intramurals/admin/matches"
                  const method = editingMatch ? "PUT" : "POST"

                  const response = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...matchForm,
                      match_time: new Date(matchForm.match_time).toISOString(),
                    }),
                  })

                  if (response.ok) {
                    toast.success(editingMatch ? "Match updated successfully" : "Match created successfully")
                    setShowMatchDialog(false)
                    setEditingMatch(null)
                    setMatchForm({
                      event_id: "",
                      team1_id: "",
                      team2_id: "",
                      match_time: "",
                      location: "",
                    })
                    fetchMatches()
                  } else {
                    const error = await response.json()
                    toast.error(error.error || "Failed to save match")
                  }
                } catch (error) {
                  console.error("Error saving match:", error)
                  toast.error("Failed to save match")
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {editingMatch ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Score Dialog */}
      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Score - {scoringMatch?.event?.name}</DialogTitle>
            <DialogDescription>
              Record the final score and winner for this match
            </DialogDescription>
          </DialogHeader>
          {scoringMatch && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Team 1 ({scoringMatch.team1?.name}) Score</Label>
                  <Input
                    type="number"
                    min={0}
                    value={scoreForm.team1_score}
                    onChange={(e) =>
                      setScoreForm({ ...scoreForm, team1_score: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Team 2 ({scoringMatch.team2?.name}) Score</Label>
                  <Input
                    type="number"
                    min={0}
                    value={scoreForm.team2_score}
                    onChange={(e) =>
                      setScoreForm({ ...scoreForm, team2_score: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Winner</Label>
                <Select
                  value={scoreForm.winner_id}
                  onValueChange={(value) => setScoreForm({ ...scoreForm, winner_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select winner (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={scoringMatch.team1_id}>
                      {scoringMatch.team1?.name || "Team 1"}
                    </SelectItem>
                    <SelectItem value={scoringMatch.team2_id}>
                      {scoringMatch.team2?.name || "Team 2"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScoreDialog(false)
                setScoringMatch(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!scoringMatch) return

                const team1Score =
                  scoreForm.team1_score.trim() === "" ? null : parseInt(scoreForm.team1_score, 10)
                const team2Score =
                  scoreForm.team2_score.trim() === "" ? null : parseInt(scoreForm.team2_score, 10)

                if (team1Score === null || team2Score === null || isNaN(team1Score) || isNaN(team2Score)) {
                  toast.error("Please enter scores for both teams")
                  return
                }

                try {
                  const response = await fetch(`/api/intramurals/admin/matches/${scoringMatch.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      winner_id: scoreForm.winner_id || null,
                      team1_score: team1Score,
                      team2_score: team2Score,
                    }),
                  })

                  if (response.ok) {
                    toast.success("Match score saved")
                    setShowScoreDialog(false)
                    setScoringMatch(null)
                    setScoreForm({ team1_score: "", team2_score: "", winner_id: "" })
                    fetchMatches()
                  } else {
                    const error = await response.json()
                    toast.error(error.error || "Failed to save score")
                  }
                } catch (error) {
                  console.error("Error saving match score:", error)
                  toast.error("Failed to save score")
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

