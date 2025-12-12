"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, CheckCircle2, Loader2, Send, Sparkles, Star } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

type OrgOption = {
  id: string
  name: string
}

const ratingScale = [
  { value: 1, label: "Very Poor", emoji: "😞" },
  { value: 2, label: "Poor", emoji: "🙁" },
  { value: 3, label: "Neutral", emoji: "😐" },
  { value: 4, label: "Good", emoji: "🙂" },
  { value: 5, label: "Excellent", emoji: "🤩" },
]

const ratingCategories = [
  { key: "accessibility", label: "Accessibility of the Organization" },
  { key: "responsiveness", label: "Responsiveness to Students" },
  { key: "transparency", label: "Transparency" },
  { key: "professionalism", label: "Professionalism" },
  { key: "helpfulness", label: "Helpfulness" },
  { key: "communication", label: "Communication & Announcements" },
  { key: "event_quality", label: "Event Quality" },
  { key: "overall_rating", label: "Overall Satisfaction" },
]

const defaultRatings = ratingCategories.reduce(
  (acc, item) => ({ ...acc, [item.key]: 3 }),
  {} as Record<string, number>
)

export function PublicFeedbackForm() {
  const { toast } = useToast()
  const [organizations, setOrganizations] = useState<OrgOption[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    org_name: "",
    user_type: "Student",
    purpose: "Concern / Complaint",
    reaction_type: "suggestion",
    comment: "",
    ratings: defaultRatings,
  })

  useEffect(() => {
    const load = async () => {
      setLoadingOrgs(true)
      try {
        const res = await fetch("/api/feedback/organizations")
        if (!res.ok) throw new Error("Failed to load organizations")
        const data = await res.json()
        setOrganizations(data.organizations || [])
      } catch (error) {
        console.error(error)
        toast({
          title: "Unable to load organizations",
          description: "Please refresh the page or try again later.",
        })
      } finally {
        setLoadingOrgs(false)
      }
    }
    load()
  }, [toast])

  const handleRatingChange = (key: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      ratings: { ...prev.ratings, [key]: value },
    }))
  }

  const resetForm = () => {
    setForm({
      org_name: "",
      user_type: "Student",
      purpose: "Concern / Complaint",
      reaction_type: "suggestion",
      comment: "",
      ratings: defaultRatings,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.org_name) {
      toast({ title: "Select an organization", description: "Please choose who should receive your feedback." })
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit feedback")
      }
      setSubmitted(true)
      resetForm()
      toast({
        title: "Thank you!",
        description: "Your feedback has been received and forwarded to the selected organization.",
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Submission failed",
        description: error.message || "Please try again in a few moments.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const heroOrgName = useMemo(() => {
    const first = organizations[0]
    if (!first) return "your college"
    return first.name
  }, [organizations])

  return (
    <section id="feedback" className="bg-[#0B1121] py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <Card className="md:w-1/3 bg-gradient-to-br from-blue-900/40 to-[#131c2e] border-blue-500/30 text-white shadow-2xl">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2 text-blue-200">
                <Star className="h-5 w-5" />
                <span className="text-xs uppercase tracking-[0.2em]">Student Feedback Center</span>
              </div>
              <CardTitle className="text-2xl font-bold leading-8">
                ⭐ Tell us how your organization is doing.
              </CardTitle>
              <CardDescription className="text-blue-100">
                Your voice drives better services, events, and transparency. No login needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-blue-100">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 mt-1 text-blue-300" />
                <p>Feedback goes straight to <strong>{heroOrgName}</strong> and stays visible to Admin only.</p>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 mt-1 text-blue-300" />
                <p>Select which college the feedback is for. No accounts or personal details required.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-1 text-blue-300" />
                <p>Anonymous by design: no name, ID, email, or course required.</p>
              </div>
              {submitted && (
                <div className="rounded-xl bg-green-500/15 border border-green-500/30 p-4 text-sm text-green-100">
                  Your feedback has been received and forwarded to the selected organization.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:flex-1 bg-[#0f172a] border-white/5 text-slate-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl">Submit Feedback</CardTitle>
              <CardDescription className="text-slate-300">Takes less than 2 minutes. Emoji ratings make it quick.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-200">Select Organization *</Label>
                    <Select
                      value={form.org_name}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, org_name: v }))}
                      disabled={loadingOrgs}
                    >
                      <SelectTrigger className="bg-[#111827] border-white/10 text-white">
                        <SelectValue placeholder={loadingOrgs ? "Loading..." : "Choose organization"} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white max-h-64">
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.name} className="hover:bg-white/10">
                            <div className="flex flex-col">
                              <span className="font-medium">{org.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-200">Purpose</Label>
                    <Select
                      value={form.purpose}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, purpose: v }))}
                    >
                      <SelectTrigger className="bg-[#111827] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        {["Concern / Complaint", "Suggestion", "Appreciation", "Event Feedback", "Service Feedback", "Other"].map(
                          (item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-200">I am a</Label>
                    <Select
                      value={form.user_type}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, user_type: v }))}
                    >
                      <SelectTrigger className="bg-[#111827] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        {["Student", "Parent", "Alumni", "Faculty", "Visitor", "Other"].map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-slate-200">Comment Type</Label>
                    <Select
                      value={form.reaction_type}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, reaction_type: v }))}
                    >
                      <SelectTrigger className="bg-[#111827] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        {[
                          { value: "positive", label: "Positive" },
                          { value: "negative", label: "Negative" },
                          { value: "suggestion", label: "Suggestion" },
                          { value: "complaint", label: "Complaint" },
                          { value: "other", label: "Other" },
                        ].map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-blue-400/50 text-blue-200 bg-blue-500/10">
                      Emoji Ratings
                    </Badge>
                    <span className="text-xs text-slate-300">1 = Very Poor, 5 = Excellent</span>
                  </div>
                  <div className="grid gap-3">
                    {ratingCategories.map((cat) => (
                      <div key={cat.key} className="bg-[#0f172a] border border-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">{cat.label}</span>
                          <span className="text-xs text-slate-400">{form.ratings[cat.key]} / 5</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ratingScale.map((option) => (
                            <button
                              type="button"
                              key={option.value}
                              onClick={() => handleRatingChange(cat.key, option.value)}
                              className={`flex-1 min-w-[80px] text-sm py-2 px-3 rounded-lg border transition ${
                                form.ratings[cat.key] === option.value
                                  ? "border-blue-400 bg-blue-500/10 text-blue-100"
                                  : "border-white/10 text-slate-200 hover:border-blue-300/40"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <span>{option.emoji}</span>
                                <span>{option.label}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-slate-200">Comment</Label>
                  <Textarea
                    value={form.comment}
                    onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                    placeholder="Share details that will help the organization respond."
                    className="bg-[#111827] border-white/10 text-white min-h-[120px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">Submissions are visible only to Admin.</div>
                  <Button
                    type="submit"
                    disabled={submitting || loadingOrgs}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}




