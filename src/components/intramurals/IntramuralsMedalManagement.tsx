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
  GitBranch,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { TournamentCreationDialog } from "./TournamentCreationDialog"
import { TournamentBracket } from "./TournamentBracket"

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
  created_at: string
  updated_at: string
  is_tournament?: boolean
  bracket_type?: string
  randomize_locked?: boolean
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

  // Event management
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [eventForm, setEventForm] = useState({ name: "", category: "sports" as "sports" | "socio-cultural" })

  // Medal assignment
  const [showMedalDialog, setShowMedalDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [medalForm, setMedalForm] = useState({
    gold_team_id: "",
    silver_team_id: "",
    bronze_team_id: "",
  })

  // Tournament management
  const [showTournamentDialog, setShowTournamentDialog] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState<Event | null>(null)
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null)

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

  const handleDeleteTournament = async (tournament: Event) => {
    if (!confirm(`Delete tournament "${tournament.name}"? This will remove the bracket and all related results.`)) {
      return
    }

    setDeletingTournamentId(tournament.id)
    try {
      const response = await fetch(`/api/intramurals/admin/tournaments/${tournament.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        toast.error(error.error || "Failed to delete tournament")
        return
      }

      toast.success("Tournament deleted")
      if (selectedTournament?.id === tournament.id) {
        setSelectedTournament(null)
      }
      await Promise.all([fetchEvents(), fetchSettings()])
    } catch (error) {
      console.error("Error deleting tournament:", error)
      toast.error("Failed to delete tournament")
    } finally {
      setDeletingTournamentId(null)
    }
  }

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

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true)
      await Promise.all([fetchTeams(), fetchEvents(), fetchSettings()])
    } finally {
      setLoading(false)
    }
  }, [fetchTeams, fetchEvents, fetchSettings])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) {
      toast.error("Team name is required")
      return
    }

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

      if (response.ok) {
        toast.success(editingTeam ? "Team updated successfully" : "Team created successfully")
        setShowTeamDialog(false)
        setEditingTeam(null)
        setTeamForm({ name: "", logo: "", color: "" })
        fetchTeams()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save team")
      }
    } catch (error) {
      console.error("Error saving team:", error)
      toast.error("Failed to save team")
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team? This will also remove all medal awards associated with this team.")) {
      return
    }

    try {
      const response = await fetch(`/api/intramurals/admin/teams/${teamId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Team deleted successfully")
        fetchTeams()
        fetchEvents() // Refresh events to update medal awards
      } else {
        toast.error("Failed to delete team")
      }
    } catch (error) {
      console.error("Error deleting team:", error)
      toast.error("Failed to delete team")
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
        body: JSON.stringify(eventForm),
      })

      if (response.ok) {
        toast.success(editingEvent ? "Event updated successfully" : "Event created successfully")
        setShowEventDialog(false)
        setEditingEvent(null)
        setEventForm({ name: "", category: "sports" })
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
    try {
      const response = await fetch("/api/intramurals/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: isVisible }),
      })

      if (response.ok) {
        toast.success(isVisible ? "Standings are now visible on main page" : "Standings hidden from main page")
        fetchSettings()
      } else {
        toast.error("Failed to update settings")
      }
    } catch (error) {
      console.error("Error updating settings:", error)
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
          <TabsTrigger value="tournaments">
            <GitBranch className="mr-2 h-4 w-4" />
            Tournaments ({events.filter(e => e.is_tournament).length})
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
                  setEventForm({ name: "", category: "sports" })
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

        {/* Tournaments Tab */}
        <TabsContent value="tournaments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tournament Management</CardTitle>
                  <CardDescription>
                    Create and manage tournament brackets with automatic medal assignment
                  </CardDescription>
                </div>
                <Button onClick={() => setShowTournamentDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tournament
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedTournament ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTournament(null)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Back to List
                    </Button>
                  </div>
                  <TournamentBracket
                    tournamentId={selectedTournament.id}
                    onUpdate={() => {
                      fetchEvents()
                      fetchSettings()
                    }}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Bracket Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.filter(e => e.is_tournament).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No tournaments yet. Click &quot;Create Tournament&quot; to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      events
                        .filter(e => e.is_tournament)
                        .map((tournament) => (
                          <TableRow key={tournament.id}>
                            <TableCell className="font-medium">{tournament.name}</TableCell>
                            <TableCell>
                              <Badge variant={tournament.category === "sports" ? "default" : "secondary"}>
                                {tournament.category === "sports" ? "🏆 Sports" : "🎭 Socio-Cultural"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tournament.bracket_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {tournament.randomize_locked ? (
                                <Badge className="bg-green-100 text-green-800">
                                  Locked
                                </Badge>
                              ) : (
                                <Badge variant="outline">Unlocked</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(tournament.created_at), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedTournament(tournament)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Bracket
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteTournament(tournament)}
                                  disabled={deletingTournamentId === tournament.id}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {deletingTournamentId === tournament.id ? "Deleting..." : "Delete"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tournament Creation Dialog */}
      <TournamentCreationDialog
        open={showTournamentDialog}
        onOpenChange={setShowTournamentDialog}
        teams={teams}
        onSuccess={() => {
          fetchEvents()
        }}
      />

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
              <Label htmlFor="team-logo">Logo URL (Optional)</Label>
              <Input
                id="team-logo"
                value={teamForm.logo}
                onChange={(e) => setTeamForm({ ...teamForm, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
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
            <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
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
    </div>
  )
}

