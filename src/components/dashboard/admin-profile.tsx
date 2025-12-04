"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

interface ProfileResponse {
  id: string
  email: string
  name: string | null
  role: "ADMIN" | "COLLEGE_ORG" | "COURSE_ORG"
  assigned_college?: string | null
  assigned_course?: string | null
  assigned_courses?: string[] | null
  org_access_level?: "finance" | "event" | "college" | null
  last_password_change_at?: string | null
}

export function AdminProfile() {
  const { data: session } = useSession()
  const { toast } = useToast()

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [name, setName] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>(
    {}
  )

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true)
        const res = await fetch("/api/profile", { cache: "no-store" })
        if (!res.ok) {
          throw new Error("Failed to load profile")
        }
        const data = (await res.json()) as ProfileResponse
        setProfile(data)
        setName(data.name || "")
      } catch (error) {
        console.error(error)
        toast({
          title: "Error",
          description: "Unable to load your profile information.",
          variant: "destructive",
        })
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [toast])

  const handleSaveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      const data = await res.json()

      if (!res.ok) {
        const description =
          data?.details?.name?.join(", ") ||
          data?.error ||
          "Failed to update profile"
          await Swal.fire({
            icon: "error",
            title: "Unable to save changes",
            text: description,
            confirmButtonColor: "#dc2626",
          })
        return
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name,
            }
          : prev
      )

        await Swal.fire({
          icon: "success",
          title: "Profile updated",
          text: "Your profile information has been saved.",
          confirmButtonColor: "#0f172a",
        })
    } catch (error) {
      console.error(error)
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: "An unexpected error occurred while saving your profile.",
          confirmButtonColor: "#dc2626",
        })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrors({})
    setChangingPassword(true)

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 422 && data?.details) {
          setPasswordErrors(data.details)
        }

        await Swal.fire({
          icon: "error",
          title: "Unable to update password",
          text: data.error || "Please check your inputs and try again.",
          confirmButtonColor: "#dc2626",
        })
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")

      await Swal.fire({
        icon: "success",
        title: "Password updated",
        text: "Your password has been changed successfully.",
        confirmButtonColor: "#0f172a",
      })
    } catch (error) {
      console.error(error)
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "An unexpected error occurred while updating your password.",
        confirmButtonColor: "#dc2626",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const roleDisplay = (() => {
    switch (profile?.role) {
      case "ADMIN":
        return "Super Admin"
      case "COLLEGE_ORG":
        return "College Organization"
      case "COURSE_ORG":
        return "Course Organization"
      default:
        return profile?.role || ""
    }
  })()

  const orgScope = (() => {
    if (!profile) return null
    if (!profile.assigned_college && !profile.assigned_course) return null
    const college = profile.assigned_college || "University-wide"
    const course = profile.assigned_course || null
    if (course) return `${college} · ${course}`
    return college
  })()

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)]">
      {/* Profile info card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle>Profile information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingProfile ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading profile...
            </div>
          ) : !profile ? (
            <p className="text-sm text-muted-foreground">
              Unable to load profile details.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email address</Label>
                  <Input value={profile.email} disabled />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Account type</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{roleDisplay}</Badge>
                    {profile.org_access_level && (
                      <Badge variant="secondary" className="capitalize">
                        {profile.org_access_level} access
                      </Badge>
                    )}
                  </div>
                </div>

                {orgScope && (
                  <div className="space-y-1.5">
                    <Label>Organization scope</Label>
                    <p className="text-sm text-muted-foreground">{orgScope}</p>
                  </div>
                )}
              </div>

              {profile.last_password_change_at && (
                <div className="space-y-1.5">
                  <Label>Last password change</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(
                      profile.last_password_change_at
                    ).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save changes
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Change password card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-red-500">
                  {passwordErrors.currentPassword.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-red-500">
                  {passwordErrors.newPassword.join(", ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters and include uppercase, lowercase,
                and a number.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmNewPassword">Confirm new password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
              {passwordErrors.confirmNewPassword && (
                <p className="text-xs text-red-500">
                  {passwordErrors.confirmNewPassword.join(", ")}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={changingPassword}>
                {changingPassword && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


