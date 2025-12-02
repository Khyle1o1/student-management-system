"use client"

import { useEffect, useState } from "react"
import {
  Calendar,
  Users,
  FileText,
  Phone,
  Mail,
  AlertCircle,
  Bell,
  BookOpen,
  GraduationCap,
  Building,
  CheckCircle,
  ArrowRight,
  Star,
  Trophy,
  Clock,
  Target,
  Award,
  TrendingUp,
  BarChart,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { LoginModal } from "@/components/ui/login-modal"
import { IntramuralsStandings } from "@/components/intramurals/IntramuralsStandings"
import { IntramuralsSchedule } from "@/components/intramurals/IntramuralsSchedule"
import { useToast } from "@/hooks/use-toast"


export default function HomePage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [visibilityLoading, setVisibilityLoading] = useState(true)
  const { toast } = useToast()

  const openLoginModal = () => {
    toast({
      title: "Opening login",
      description: "Preparing secure login portal...",
    })
    setIsLoginModalOpen(true)
  }
  const closeLoginModal = () => {
    toast({
      title: "Login closed",
      description: "You can reopen the portal anytime from the header button.",
    })
    setIsLoginModalOpen(false)
  }

  useEffect(() => {
    const fetchVisibility = async () => {
      try {
        setVisibilityLoading(true)
        const response = await fetch("/api/intramurals/settings/visibility")
        if (response.ok) {
          const data = await response.json()
          setIsVisible(data.visible || false)
          toast({
            title: "Intramurals visibility loaded",
            description: data.visible
              ? "Showing intramurals medal tally on the homepage."
              : "Showing full SmartU landing page.",
          })
        }
      } catch (error) {
        console.error("Error fetching visibility:", error)
        setIsVisible(false)
        toast({
          title: "Intramurals visibility error",
          description: "Failed to load visibility settings. Showing default view.",
          variant: "destructive",
        })
      } finally {
        setVisibilityLoading(false)
      }
    }

    fetchVisibility()
  }, [])


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navbar */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#191970] to-indigo-700 flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-indigo-600 uppercase">SMART-U</p>
              <p className="text-sm text-slate-500">Student Management & Activity Real-Time Utility</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#home" className="hover:text-indigo-700 transition-colors">
              Home
            </a>
            <a href="#features" className="hover:text-indigo-700 transition-colors">
              Features
            </a>
            <a href="#about" className="hover:text-indigo-700 transition-colors">
              About
            </a>
            <a href="#contact" className="hover:text-indigo-700 transition-colors">
              Contact
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={openLoginModal}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-full px-5"
            >
              Login
            </Button>
          </nav>

          <div className="flex md:hidden">
            <Button
              size="sm"
              onClick={openLoginModal}
              className="bg-gradient-to-r from-[#191970] to-indigo-700 text-white rounded-full px-5 shadow-md"
            >
              Login
              <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Intramurals banner section (when enabled) */}
        {isVisible && !visibilityLoading && (
          <section className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50">
            <div className="container mx-auto px-4 py-8 space-y-4">
              <Badge className="bg-white/80 text-indigo-700 border border-indigo-100 rounded-full shadow-sm w-fit">
                <Trophy className="w-3 h-3 mr-1" />
                Live Intramurals Medal Tally
              </Badge>
              <p className="text-xs md:text-sm text-slate-600 max-w-2xl">
                SMART-U is currently highlighting real-time intramurals results for your campus. Scroll down anytime
                to explore the full platform.
              </p>
            </div>
            <div className="container mx-auto px-4 pb-10">
              <div className="grid lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                  <Card className="border-none shadow-lg shadow-indigo-100/60 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#191970] to-indigo-700 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-300" />
                            Intramurals Standings
                          </CardTitle>
                          <CardDescription className="text-indigo-100 mt-1">
                            Real-time medal counts, rankings, and performance highlights.
                          </CardDescription>
                        </div>
                        <Badge className="bg-amber-400 text-slate-900 rounded-full px-3 py-1 text-xs font-semibold">
                          Live
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <IntramuralsStandings />
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4">
                  <Card className="border-none shadow-md shadow-indigo-100 rounded-2xl overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        Intramurals Schedule
                      </CardTitle>
                      <CardDescription>Stay ahead with upcoming matches and events.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <IntramuralsSchedule />
                    </CardContent>
                  </Card>

                  <div className="rounded-2xl border border-dashed border-indigo-100 bg-white/80 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>Explore the full SMART-U experience</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      SMART-U goes beyond intramurals. Manage fees, track attendance, generate reports, and more in one
                      unified platform.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs"
                      onClick={() => {
                        const el = document.getElementById("home")
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth" })
                        }
                      }}
                    >
                      View SMART-U overview
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Hero section */}
        <section
          id="home"
          className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-white via-slate-50 to-slate-100"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-40 -top-40 h-72 w-72 rounded-full bg-indigo-100 blur-3xl opacity-60" />
            <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-sky-100 blur-3xl opacity-60" />
          </div>

          <div className="container mx-auto px-4 py-16 md:py-24 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  A Unified Platform for Smarter Campus Management
                </Badge>

                <div className="space-y-3">
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
                    SMART-U
                  </h1>
                  <p className="text-lg md:text-xl text-slate-600 max-w-xl">
                    Student Management and Activity Real-Time Utility that centralizes fees, attendance, reports, and
                    intramurals into one intelligent campus hub.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={openLoginModal}
                    className="bg-gradient-to-r from-[#191970] to-indigo-700 hover:from-[#141455] hover:to-indigo-800 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-slate-200 text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-2 px-6"
                    onClick={() => {
                      const el = document.getElementById("features")
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth" })
                      }
                    }}
                  >
                    View Features
                    <BarChart className="w-4 h-4 text-indigo-600" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Secure & role-based access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Real-time data & updates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-500" />
                    <span>Designed for busy school operations</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-indigo-100 via-sky-100 to-emerald-100 blur-2xl opacity-80" />
                <div className="relative rounded-3xl bg-white shadow-2xl shadow-indigo-100/60 border border-slate-100 p-6 md:p-8 space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <Building className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">
                          SMART-U Snapshot
                        </p>
                        <p className="text-sm text-slate-500">Centralized school operations</p>
                      </div>
                    </div>
                    <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]">
                      Live Campus View
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <Card className="border-none bg-slate-50/70 shadow-sm rounded-2xl">
                      <CardContent className="pt-4 pb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <span className="font-semibold text-slate-800 text-xs">Fees Management</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Track dues, payments, and receipts with clear student-level visibility.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-none bg-slate-50/70 shadow-sm rounded-2xl">
                      <CardContent className="pt-4 pb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-800 text-xs">Attendance Tracking</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Capture attendance in minutes with reliable summaries per class and student.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-none bg-slate-50/70 shadow-sm rounded-2xl">
                      <CardContent className="pt-4 pb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart className="w-4 h-4 text-amber-600" />
                          <span className="font-semibold text-slate-800 text-xs">Reports</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Generate up-to-date academic and operational reports in just a few clicks.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-none bg-slate-50/70 shadow-sm rounded-2xl">
                      <CardContent className="pt-4 pb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-rose-500" />
                          <span className="font-semibold text-slate-800 text-xs">Intramurals</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Showcase team standings, schedules, and medals with real-time updates.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="border-emerald-200 bg-emerald-50/80 text-emerald-800 rounded-2xl text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <AlertDescription>
                      SMART-U keeps academic, financial, and activity data synchronized so administrators, faculty, and
                      students stay aligned.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core feature highlights */}
        <section id="features" className="py-14 md:py-20 bg-white">
          <div className="container mx-auto px-4 space-y-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <Badge className="bg-slate-100 text-slate-800 rounded-full px-4 py-1 text-xs font-semibold">
                Key Modules
              </Badge>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                Four Pillars of Smarter Campus Operations
              </h2>
              <p className="text-sm md:text-base text-slate-600">
                SMART-U consolidates critical school workflows into four focused modules designed for real-world campus
                needs.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="group border-slate-100 shadow-sm hover:shadow-lg transition-shadow rounded-2xl">
                <CardHeader>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                    <Building className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base">Fees Management</CardTitle>
                  <CardDescription className="text-xs mt-2">
                    Centralize tuition, miscellaneous fees, and payment status with clear history per student.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Automated fee assignment and tracking
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Receipt and payment verification workflows
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-slate-100 shadow-sm hover:shadow-lg transition-shadow rounded-2xl">
                <CardHeader>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base">Attendance Tracking</CardTitle>
                  <CardDescription className="text-xs mt-2">
                    Capture and review attendance across classes, events, and activities with instant summaries.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Student-level statistics and trends
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Flexible attendance types and overrides
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-slate-100 shadow-sm hover:shadow-lg transition-shadow rounded-2xl">
                <CardHeader>
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base">Reports</CardTitle>
                  <CardDescription className="text-xs mt-2">
                    Generate clear, actionable reports for administrators, faculty, and regulatory requirements.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-indigo-500" />
                    Real-time academic and operational insights
                  </p>
                  <p className="flex items-center gap-2">
                    <BarChart className="w-3 h-3 text-indigo-500" />
                    Exportable summaries and history
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-slate-100 shadow-sm hover:shadow-lg transition-shadow rounded-2xl">
                <CardHeader>
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base">Intramurals Management</CardTitle>
                  <CardDescription className="text-xs mt-2">
                    Highlight campus spirit with structured tournament schedules, results, and medal tallies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-2">
                    <Award className="w-3 h-3 text-amber-500" />
                    Automated medal tally and rankings
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-indigo-500" />
                    Clear visibility for teams, coaches, and students
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* About / purpose section */}
        <section id="about" className="py-16 md:py-20 bg-slate-50 border-y border-slate-100">
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <Badge className="bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold">
                Built for modern school operations
              </Badge>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                What is SMART-U and how does it support your campus?
              </h2>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                SMART-U (Student Management and Activity Real-Time Utility) is designed to unify fragmented school tools
                into one cohesive platform. From enrollment to graduation, it helps administrators, faculty, and student
                leaders operate with clarity and speed.
              </p>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                By combining fees management, attendance tracking, academic reporting, and intramural activities,
                SMART-U gives your institution a reliable single source of truth. Less manual work, fewer errors, and
                more time for meaningful student engagement.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4 text-xs">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Secure & role-based</p>
                    <p className="text-slate-600">
                      Access is tailored for registrars, cashiers, teachers, student leaders, and more.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Real-time visibility</p>
                    <p className="text-slate-600">
                      Updates propagate instantly, keeping key stakeholders on the same page.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="border-none bg-white shadow-xl shadow-indigo-100/50 rounded-3xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Designed around real workflows
                  </CardTitle>
                  <CardDescription className="text-xs">
                    SMART-U has been shaped by real campus scenarios, from student government initiatives to registrar
                    operations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-2">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Reduce manual encoding and consolidation across multiple spreadsheets.
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Improve data accuracy with focused modules and controlled access.
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Provide students and stakeholders a transparent view of their status.
                  </p>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-3 gap-4 text-center text-xs">
                <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-sm">
                  <p className="text-lg font-semibold text-slate-900">4+</p>
                  <p className="text-slate-600 mt-1">Core modules unified</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-sm">
                  <p className="text-lg font-semibold text-slate-900">Real-time</p>
                  <p className="text-slate-600 mt-1">Updates & summaries</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-sm">
                  <p className="text-lg font-semibold text-slate-900">Campus-wide</p>
                  <p className="text-slate-600 mt-1">Coverage & visibility</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why choose SMART-U / testimonials-style section */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container mx-auto px-4 space-y-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <Badge className="bg-slate-100 text-slate-800 rounded-full px-4 py-1 text-xs font-semibold">
                Why Choose SMART-U
              </Badge>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                Built for administrators, designed for students
              </h2>
              <p className="text-sm md:text-base text-slate-600">
                SMART-U balances operational efficiency with a student-friendly experience, making it easier to run your
                campus while keeping student life at the center.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="border-slate-100 shadow-sm rounded-2xl flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Star className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Operational clarity</CardTitle>
                      <CardDescription className="text-xs">
                        For registrars, cashiers, administrators, and student affairs.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-2 flex-1">
                  <p>
                    Quickly see who is cleared for enrollment, who has pending fees, and how attendance impacts academic
                    records—all from a unified view.
                  </p>
                  <p className="italic border-l-2 border-indigo-100 pl-3 text-slate-500">
                    “SMART-U lets us spend less time reconciling data and more time solving real student concerns.”
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm rounded-2xl flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Student-centered</CardTitle>
                      <CardDescription className="text-xs">
                        Clear, timely information for students and organizations.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-2 flex-1">
                  <p>
                    Students see accurate standings, attendance summaries, and intramurals results, helping them stay
                    engaged and informed throughout the semester.
                  </p>
                  <p className="italic border-l-2 border-emerald-100 pl-3 text-slate-500">
                    “Our student government can now highlight achievements and events with real-time data.”
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm rounded-2xl flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Secure & reliable</CardTitle>
                      <CardDescription className="text-xs">
                        Backed by modern security practices and role-based access.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 space-y-2 flex-1">
                  <p>
                    SMART-U is designed with data integrity and privacy in mind, helping institutions uphold compliance
                    while maintaining accessibility for authorized users.
                  </p>
                  <p className="italic border-l-2 border-slate-100 pl-3 text-slate-500">
                    “We trust SMART-U to handle sensitive records without sacrificing ease of use.”
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact / CTA section */}
        <section
          id="contact"
          className="py-14 md:py-20 bg-gradient-to-r from-[#191970] via-indigo-800 to-sky-700 text-white"
        >
          <div className="container mx-auto px-4 grid lg:grid-cols-[3fr,2fr] gap-10 items-center">
            <div className="space-y-4">
              <Badge className="bg-white/10 text-indigo-100 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                Ready to modernize your campus operations?
              </Badge>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Bring SMART-U to your school</h2>
              <p className="text-sm md:text-base text-indigo-100/90 leading-relaxed max-w-xl">
                Whether you are starting with fees, attendance, reports, or intramurals, SMART-U can be rolled out
                module by module while keeping a unified platform at the core.
              </p>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-amber-300" />
                  <span className="text-indigo-100">Coordinate with your campus ICT or student affairs office.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-amber-300" />
                  <span className="text-indigo-100">For technical coordination, reach out to the system developer.</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={openLoginModal}
                  className="bg-white text-[#191970] hover:bg-slate-100 font-semibold rounded-full px-8 shadow-lg"
                >
                  Login to SMART-U
                </Button>
                <Button
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 rounded-full px-6"
                  onClick={() => {
                    const el = document.getElementById("about")
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth" })
                    }
                  }}
                >
                  Learn more about the system
                </Button>
              </div>
            </div>

            <Card className="bg-white/5 border border-white/20 rounded-3xl shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Building className="w-4 h-4 text-amber-300" />
                  School & developer information
                </CardTitle>
                <CardDescription className="text-xs text-indigo-100/90">
                  Official system and support contacts for SMART-U.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-indigo-50">
                <div>
                  <p className="font-semibold text-sm">Institution</p>
                  <p className="text-indigo-100">Bukidnon State University</p>
                  <p className="text-indigo-200">Fortich St. Malaybalay City, Bukidnon</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Student Government / SSC</p>
                  <a
                    href="https://www.facebook.com/BUKSUSSC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-100 underline-offset-2 hover:underline"
                  >
                    Facebook: BukSU SSC
                  </a>
                </div>
                <div className="border-t border-white/20 pt-3">
                  <p className="font-semibold text-sm mb-1">System Developer</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-900 border border-amber-300 overflow-hidden">
                      <img
                        src="/khyle.jpg"
                        alt="Khyle Ivan khim V. Amacna"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-indigo-50">Khyle Ivan khim V. Amacna</p>
                      <p className="text-indigo-200 text-xs">System Developer, Angel Of God Tech</p>
                    </div>
                  </div>
                  <p className="text-indigo-100 text-xs">Email: aogtech.ph@gmail.com</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 bg-[#191970] text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shadow-md">
                  <GraduationCap className="w-6 h-6 text-[#191970]" />
                </div>
                <div>
                  <p className="text-lg font-semibold">SMART-U</p>
                  <p className="text-xs text-blue-100">
                    Student Management and Activity Real-Time Utility
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                A unified platform to support academic excellence, student engagement, and transparent campus
                operations.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-semibold text-sm mb-1">Quick Links</p>
              <div className="flex flex-col gap-1 text-blue-100">
                <a href="#home" className="hover:text-amber-300 transition-colors">
                  Home
                </a>
                <a href="#features" className="hover:text-amber-300 transition-colors">
                  Features
                </a>
                <a href="#about" className="hover:text-amber-300 transition-colors">
                  About
                </a>
                <a href="#contact" className="hover:text-amber-300 transition-colors">
                  Contact / Login
                </a>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-semibold text-sm mb-1">Developer</p>
              <p className="text-blue-100">Angel Of God Tech</p>
              <p className="text-blue-100">© {new Date().getFullYear()} Angel Of God Tech. All rights reserved.</p>
              <div className="flex gap-4 text-blue-100 pt-1">
                <a href="#" className="hover:text-amber-300 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-amber-300 transition-colors">
                  Terms
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal rendered globally so it works in all modes */}
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </div>
    )
  }
