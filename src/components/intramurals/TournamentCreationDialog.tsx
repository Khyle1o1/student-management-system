"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Save } from "lucide-react"
import { toast } from "react-hot-toast"

interface Team {
  id: string
  name: string
}

interface TournamentCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: Team[]
  onSuccess: () => void
}

export function TournamentCreationDialog({
  open,
  onOpenChange,
  teams,
  onSuccess,
}: TournamentCreationDialogProps) {
  const [form, setForm] = useState({
    name: "",
    category: "sports" as "sports" | "socio-cultural",
    bracket_type: "single_elimination" as "single_elimination" | "double_elimination" | "round_robin",
    randomize_teams: false,
    max_random_attempts: 5,
    selected_teams: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Tournament name is required")
      return
    }

    if (form.selected_teams.length < 2) {
      toast.error("At least 2 teams are required for a tournament")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/intramurals/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          bracket_type: form.bracket_type,
          team_ids: form.selected_teams,
          randomize_teams: form.randomize_teams,
          max_random_attempts: form.max_random_attempts,
        }),
      })

      if (response.ok) {
        toast.success("Tournament created successfully")
        setForm({
          name: "",
          category: "sports",
          bracket_type: "single_elimination",
          randomize_teams: false,
          max_random_attempts: 5,
          selected_teams: [],
        })
        onOpenChange(false)
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create tournament")
      }
    } catch (error) {
      console.error("Error creating tournament:", error)
      toast.error("Failed to create tournament")
    } finally {
      setSaving(false)
    }
  }

  const toggleTeam = (teamId: string) => {
    setForm((prev) => ({
      ...prev,
      selected_teams: prev.selected_teams.includes(teamId)
        ? prev.selected_teams.filter((id) => id !== teamId)
        : [...prev.selected_teams, teamId],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
          <DialogDescription>
            Create a tournament bracket for teams to compete
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="tournament-name">Tournament Name *</Label>
            <Input
              id="tournament-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Basketball Championship"
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={form.category}
              onValueChange={(value: "sports" | "socio-cultural") =>
                setForm({ ...form, category: value })
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
            <Label htmlFor="bracket-type">Bracket Type *</Label>
            <Select
              value={form.bracket_type}
              onValueChange={(value: any) =>
                setForm({ ...form, bracket_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_elimination">Single Elimination</SelectItem>
                <SelectItem value="double_elimination">Double Elimination</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="randomize">Randomize Teams</Label>
              <p className="text-sm text-muted-foreground">
                Automatically shuffle teams for first-round matchups
              </p>
            </div>
            <Switch
              id="randomize"
              checked={form.randomize_teams}
              onCheckedChange={(checked) =>
                setForm({ ...form, randomize_teams: checked })
              }
            />
          </div>

          <div>
            <Label htmlFor="max-attempts">Max Randomization Attempts</Label>
            <Input
              id="max-attempts"
              type="number"
              min="1"
              max="10"
              value={form.max_random_attempts}
              onChange={(e) =>
                setForm({
                  ...form,
                  max_random_attempts: parseInt(e.target.value) || 5,
                })
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Maximum number of times the bracket can be reshuffled
            </p>
          </div>

          <div>
            <Label>Select Teams * ({form.selected_teams.length} selected)</Label>
            <div className="mt-2 border rounded-lg p-4 max-h-64 overflow-y-auto">
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No teams available. Create teams first.
                </p>
              ) : (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded"
                    >
                      <Checkbox
                        id={`team-${team.id}`}
                        checked={form.selected_teams.includes(team.id)}
                        onCheckedChange={() => toggleTeam(team.id)}
                      />
                      <label
                        htmlFor={`team-${team.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {team.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Select at least 2 teams to participate
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Creating..." : "Create Tournament"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

