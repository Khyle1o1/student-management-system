"use client"

import { useState, useEffect } from "react"
import {
  Trophy,
  CreditCard,
  CalendarCheck,
  BarChart3,
  ShieldCheck,
  Zap,
  Menu,
  X,
  ChevronRight,
  Users,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Activity,
  ArrowUpRight,
} from "lucide-react"
import { LoginModal } from "@/components/ui/login-modal"
import { IntramuralsStandings } from "@/components/intramurals/IntramuralsStandings"
import { IntramuralsSchedule } from "@/components/intramurals/IntramuralsSchedule"
import { AnnouncementsFeed } from "@/components/intramurals/AnnouncementsFeed"
import { useToast } from "@/hooks/use-toast"
import { PublicFeedbackForm } from "@/components/feedback/public-feedback-form"
import { MaintenanceBanner } from "@/components/maintenance-banner"

// --- Components ---

const Navbar = ({ onLoginClick }: { onLoginClick: () => void }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed w-full z-50 top-0 left-0 border-b border-white/10 bg-[#0B1121]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <LayoutDashboard className="text-white w-6 h-6" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">SMART-U</span>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {['Features', 'Feedback', 'About', 'Contact'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md text-sm font-medium"
                >
                  {item}
                </a>
              ))}
              <button
                onClick={onLoginClick}
                className="bg-white text-[#0B1121] px-5 py-2.5 rounded-full font-bold hover:bg-blue-50 transition-all transform hover:scale-105"
              >
                Login
              </button>
            </div>
          </div>

          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 hover:text-white p-2"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

const Hero = ({ onGetStartedClick }: { onGetStartedClick: () => void }) => {
  return (
    <div className="relative pt-32 pb-20 lg:pt-48 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-blue-300 text-sm font-medium">Live Campus View is now active</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-8">
            The Operating System for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Modern Campuses
            </span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-10">
            Smart-U unifies fees, attendance, and—uniquely—intramurals into one fluid dashboard. Designed for administrators, built for students.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={onGetStartedClick}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              Get Started <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("features")
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" })
                }
              }}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold text-lg transition-all backdrop-blur-sm"
            >
              View Demo
            </button>
          </div>
        </div>

        {/* Floating UI Mockup Representation */}
        <div className="mt-20 relative mx-auto max-w-5xl">
          <div className="relative rounded-2xl bg-[#131c2e] border border-white/10 p-2 shadow-2xl">
            <div className="rounded-xl overflow-hidden bg-[#0B1121] aspect-[16/9] relative group p-6">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <LayoutDashboard className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">SMART-U Dashboard</h3>
                    <p className="text-gray-500 text-xs">Real-time campus overview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-green-400 text-xs font-medium">Live</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {/* Fees Card */}
                <div className="bg-[#131c2e] border border-white/5 rounded-lg p-3 hover:border-green-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-400" />
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                  </div>
                  <p className="text-white font-bold text-lg">₱2.4M</p>
                  <p className="text-gray-500 text-[10px]">Total Fees</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-[10px]">+12.5%</span>
                  </div>
                </div>

                {/* Attendance Card */}
                <div className="bg-[#131c2e] border border-white/5 rounded-lg p-3 hover:border-orange-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4 text-orange-400" />
                    </div>
                    <Activity className="w-3 h-3 text-orange-400" />
                  </div>
                  <p className="text-white font-bold text-lg">94.2%</p>
                  <p className="text-gray-500 text-[10px]">Attendance</p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-orange-400" />
                    <span className="text-orange-400 text-[10px]">1,247</span>
                  </div>
                </div>

                {/* Students Card */}
                <div className="bg-[#131c2e] border border-white/5 rounded-lg p-3 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <Users className="w-3 h-3 text-blue-400" />
                  </div>
                  <p className="text-white font-bold text-lg">3,428</p>
                  <p className="text-gray-500 text-[10px]">Students</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-400 text-[10px]">Active</span>
                  </div>
                </div>

                {/* Intramurals Card */}
                <div className="bg-[#131c2e] border border-white/5 rounded-lg p-3 hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-purple-400" />
                    </div>
                    <Trophy className="w-3 h-3 text-purple-400" />
                  </div>
                  <p className="text-white font-bold text-lg">24</p>
                  <p className="text-gray-500 text-[10px]">Events</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Activity className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-400 text-[10px]">Live</span>
                  </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="grid grid-cols-3 gap-3">
                {/* Activity Chart */}
                <div className="col-span-2 bg-[#131c2e] border border-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white text-xs font-semibold">Activity Overview</h4>
                    <BarChart3 className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex items-end justify-between gap-1 h-24">
                    {[65, 78, 52, 89, 94, 76, 88, 92, 85, 98, 87, 95].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-blue-600/40 to-blue-500/20 rounded-t hover:from-blue-500/60 hover:to-blue-400/30 transition-all"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                    <span>Sun</span>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-[#131c2e] border border-white/5 rounded-lg p-4">
                  <h4 className="text-white text-xs font-semibold mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="w-3 h-3 text-green-400" />
                      </div>
                      <p className="text-gray-400 text-[10px] flex-1">Payment received</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-orange-500/10 flex items-center justify-center">
                        <CalendarCheck className="w-3 h-3 text-orange-400" />
                      </div>
                      <p className="text-gray-400 text-[10px] flex-1">Attendance logged</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center">
                        <Trophy className="w-3 h-3 text-purple-400" />
                      </div>
                      <p className="text-gray-400 text-[10px] flex-1">Medal awarded</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module Quick Access */}
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20 rounded-full"></div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <span className="text-gray-400 text-[10px]">Real-time sync</span>
                </div>
                <div className="flex-1 h-1 bg-gradient-to-r from-green-500/20 via-purple-500/20 to-blue-500/20 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const FeatureBento = () => {
  return (
    <div id="features" className="py-24 bg-[#0B1121] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Four Pillars of Smart-U</h2>
          <p className="text-gray-400 max-w-xl">We consolidated critical workflows into four focused modules designed for real-world campus needs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Large Card: Intramurals (Highlighting this based on your interests) */}
          <div className="md:col-span-2 bg-gradient-to-br from-blue-900/40 to-[#131c2e] border border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/50 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all"></div>
            <div className="bg-blue-600/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Trophy className="text-blue-400 w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Intramurals Management</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Automated bracket generation, real-time medal tallies, and live scoring.
              The only campus tool that treats student activities as a first-class citizen.
            </p>
            {/* Visual Decor for Bracket */}
            <div className="flex gap-2 opacity-50">
              <div className="h-2 w-12 bg-blue-500/50 rounded-full"></div>
              <div className="h-2 w-8 bg-gray-600 rounded-full"></div>
            </div>
          </div>

          {/* Tall Card: Fees */}
          <div className="md:row-span-2 bg-[#131c2e] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-all">
            <div className="bg-green-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <CreditCard className="text-green-400 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Fees & Payments</h3>
            <p className="text-gray-400 text-sm mb-8">
              Centralize tuition and miscellaneous fees. Real-time payment verification and history per student.
            </p>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                  <div className="w-20 h-2 bg-gray-700 rounded"></div>
                  <div className="w-8 h-4 bg-green-500/20 rounded text-[10px] text-green-400 flex items-center justify-center">PAID</div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Attendance */}
          <div className="bg-[#131c2e] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-all">
            <div className="bg-orange-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <CalendarCheck className="text-orange-400 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Attendance</h3>
            <p className="text-gray-400 text-sm">
              Capture attendance in seconds. Generate reliable summaries per class and student.
            </p>
          </div>

          {/* Card: Reports */}
          <div className="bg-[#131c2e] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-all">
            <div className="bg-purple-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <BarChart3 className="text-purple-400 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Instant Reports</h3>
            <p className="text-gray-400 text-sm">
              Exportable summaries and history. Real-time operational insights for admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ValueProps = () => {
  const props = [
    { icon: ShieldCheck, title: "Secure & Role-Based", desc: "Access tailored for registrars, cashiers, and student leaders." },
    { icon: Zap, title: "Real-Time Updates", desc: "Data propagates instantly across the campus network." },
    { icon: Users, title: "Student Centered", desc: "Transparency for students regarding their own academic status." },
  ]

  return (
    <div id="about" className="py-24 bg-[#0B1121] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-12">
          {props.map((item, idx) => (
            <div key={idx} className="flex flex-col items-start">
              <div className="p-3 bg-white/5 rounded-lg mb-4">
                <item.icon className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>
              <p className="text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Footer = () => {
  return (
    <footer id="contact" className="bg-[#050914] pt-20 pb-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <LayoutDashboard className="text-blue-500 w-6 h-6" />
              <span className="text-white font-bold text-xl">SMART-U</span>
            </div>
            <p className="text-gray-400 max-w-sm mb-6">
              Student Management and Activity Real-Time Utility. Modernizing campus operations one module at a time.
            </p>
            <div className="flex items-center gap-4">
              {/* Developer Badge */}
              <div className="flex items-center gap-3 bg-white/5 p-2 pr-4 rounded-full border border-white/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold">
                  K
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">System Developer</span>
                  <span className="text-sm text-white font-medium">Khyle / Angel Of God Tech</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-gray-400 text-sm">
              <li><a href="#features" className="hover:text-blue-400">Features</a></li>
              <li><a href="#about" className="hover:text-blue-400">Security</a></li>
              <li><a href="#" className="hover:text-blue-400">Roadmap</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Contact</h4>
            <ul className="space-y-4 text-gray-400 text-sm">
              <li>Bukidnon State University</li>
              <li>aogtech.ph@gmail.com</li>
              <li>Malaybalay City</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">© 2025 Angel Of God Tech. All rights reserved.</p>
          <div className="flex gap-6 text-gray-500 text-sm">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

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
        }
      } catch (error) {
        console.error("Error fetching visibility:", error)
        setIsVisible(false)
      } finally {
        setVisibilityLoading(false)
      }
    }

    fetchVisibility()
  }, [])


  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Maintenance Banner - Shows when system is in maintenance mode */}
      <MaintenanceBanner />
      
      <style dangerouslySetInnerHTML={{__html: `
        /* Dark mode styles for intramurals-related modals only */
        body .intramurals-dark-mode .fixed.inset-0 .bg-white {
          background-color: #131c2e !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 .border-slate-200,
        body .intramurals-dark-mode .fixed.inset-0 .border-slate-100 {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 .bg-yellow-50 {
          background-color: rgba(251, 191, 36, 0.15) !important;
          border-color: rgba(251, 191, 36, 0.3) !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 .bg-slate-50 {
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 .bg-amber-50 {
          background-color: rgba(217, 119, 6, 0.15) !important;
          border-color: rgba(217, 119, 6, 0.3) !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 .text-\\[\\#191970\\] {
          color: #60a5fa !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 .text-slate-600,
        body .intramurals-dark-mode .fixed.inset-0 .text-slate-700,
        body .intramurals-dark-mode .fixed.inset-0 .text-slate-500 {
          color: #cbd5e1 !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 h3,
        body .intramurals-dark-mode .fixed.inset-0 h4 {
          color: #ffffff !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 table thead {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 table thead th {
          color: #e2e8f0 !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 table tbody tr {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 table tbody tr:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 table tbody td {
          color: #cbd5e1 !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 button.bg-white,
        body .intramurals-dark-mode .fixed.inset-0 button[class*="bg-"] {
          background-color: rgba(59, 130, 246, 0.2) !important;
          border-color: rgba(59, 130, 246, 0.3) !important;
          color: #ffffff !important;
        }
        body .intramurals-dark-mode .fixed.inset-0 button:hover {
          background-color: rgba(59, 130, 246, 0.3) !important;
        }
        /* Ensure login modal keeps its light card styling */
        body .login-modal-overlay .bg-white {
          background-color: #ffffff !important;
          border-color: rgba(148, 163, 184, 0.4) !important;
        }
        body .login-modal-overlay .bg-blue-50 {
          background-color: #eff6ff !important;
          border-color: rgba(59, 130, 246, 0.2) !important;
        }
        body .login-modal-overlay .bg-gray-50 {
          background-color: #f9fafb !important;
        }
        body .login-modal-overlay .text-\\[\\#191970\\] {
          color: #191970 !important;
        }
        body .login-modal-overlay .text-gray-500,
        body .login-modal-overlay .text-gray-600 {
          color: #6b7280 !important;
        }
        /* IntramuralsSchedule dark mode styles */
        .intramurals-dark-mode .bg-gradient-to-b.from-white.to-slate-50 {
          background: transparent !important;
        }
        .intramurals-dark-mode .bg-white {
          background-color: #131c2e !important;
        }
        .intramurals-dark-mode .bg-gradient-to-r.from-white.to-slate-50 {
          background: linear-gradient(to right, #131c2e, #131c2e) !important;
        }
        .intramurals-dark-mode .text-\\[\\#191970\\] {
          color: #60a5fa !important;
        }
        .intramurals-dark-mode .bg-\\[\\#191970\\] {
          background-color: rgba(59, 130, 246, 0.2) !important;
        }
        .intramurals-dark-mode .border-slate-200 {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .intramurals-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .intramurals-dark-mode .bg-slate-50 {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .intramurals-dark-mode .bg-blue-600 {
          background-color: rgba(59, 130, 246, 0.3) !important;
        }
        .intramurals-dark-mode .bg-blue-700 {
          background-color: rgba(59, 130, 246, 0.4) !important;
        }
        .intramurals-dark-mode .text-white {
          color: #ffffff !important;
        }
        .intramurals-dark-mode .hover\\:bg-blue-700:hover {
          background-color: rgba(59, 130, 246, 0.5) !important;
        }
        .intramurals-dark-mode .border-blue-200 {
          border-color: rgba(59, 130, 246, 0.3) !important;
        }
        .intramurals-dark-mode .bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        .intramurals-dark-mode .text-blue-600 {
          color: #60a5fa !important;
        }
        .intramurals-dark-mode .text-blue-700 {
          color: #93c5fd !important;
        }
        .intramurals-dark-mode .bg-purple-600 {
          background-color: rgba(147, 51, 234, 0.3) !important;
        }
        .intramurals-dark-mode .bg-purple-700 {
          background-color: rgba(147, 51, 234, 0.4) !important;
        }
        .intramurals-dark-mode .hover\\:bg-purple-700:hover {
          background-color: rgba(147, 51, 234, 0.5) !important;
        }
        .intramurals-dark-mode .border-purple-200 {
          border-color: rgba(147, 51, 234, 0.3) !important;
        }
        .intramurals-dark-mode .bg-purple-50 {
          background-color: rgba(147, 51, 234, 0.1) !important;
        }
        .intramurals-dark-mode .text-purple-600 {
          color: #a78bfa !important;
        }
                  .intramurals-dark-mode .text-purple-700 {
                    color: #c4b5fd !important;
                  }
                  /* Schedule cards specific styling */
                  .intramurals-dark-mode .rounded-2xl.bg-white {
                    background-color: #131c2e !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .intramurals-dark-mode .shadow-md {
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2) !important;
                  }
                  .intramurals-dark-mode .shadow-xl {
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
                  }
                  .intramurals-dark-mode .text-slate-200 {
                    color: #e2e8f0 !important;
                  }
                  .intramurals-dark-mode .text-slate-500 {
                    color: #94a3b8 !important;
                  }
                  .intramurals-dark-mode [class*="from-[#191970]"],
                  .intramurals-dark-mode [class*="from-\\[\\#191970\\]"] {
                    background: linear-gradient(to right, rgba(59, 130, 246, 0.3), rgba(30, 58, 138, 0.3), rgba(15, 23, 42, 0.3)) !important;
                  }
                  .intramurals-dark-mode [class*="from-[#0f172a]"],
                  .intramurals-dark-mode [class*="from-\\[\\#0f172a\\]"] {
                    background: linear-gradient(to right, rgba(15, 23, 42, 0.3), rgba(30, 58, 138, 0.3), rgba(75, 31, 168, 0.3)) !important;
                  }
                  .intramurals-dark-mode [class*="bg-gradient-to-r"] {
                    opacity: 0.8 !important;
                  }
                  .intramurals-dark-mode button.bg-\\[\\#191970\\] {
                    background-color: rgba(59, 130, 246, 0.3) !important;
                    border-color: rgba(59, 130, 246, 0.4) !important;
                  }
                  .intramurals-dark-mode button.hover\\:bg-\\[\\#151554\\]:hover {
                    background-color: rgba(59, 130, 246, 0.4) !important;
                  }
                  .intramurals-dark-mode .bg-\\[\\#191970\\] {
                    background-color: rgba(59, 130, 246, 0.2) !important;
                  }
                `}} />
      <Navbar onLoginClick={openLoginModal} />
      
      {/* Intramurals banner section (when enabled) */}
      {isVisible && !visibilityLoading && (
        <section className="relative pt-32 pb-24 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span className="text-purple-300 text-sm font-medium">Live Intramurals Medal Tally</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Campus <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Intramurals</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Real-time standings, schedules, and medal counts for Bukidnon State University Intramurals 2026
              </p>
            </div>
            
          {/* Wrapped in dashboard-style container with dark mode */}
          <div className="mt-12 relative mx-auto max-w-7xl">
            <div className="relative rounded-2xl bg-[#131c2e] border border-white/10 p-2 shadow-2xl">
              <div className="rounded-xl overflow-hidden bg-[#0B1121] relative group">
                <style dangerouslySetInnerHTML={{__html: `
                  .intramurals-dark-mode section {
                    background: transparent !important;
                    background-image: none !important;
                  }
                  .intramurals-dark-mode .bg-white,
                  .intramurals-dark-mode .bg-slate-50,
                  .intramurals-dark-mode .bg-slate-100 {
                    background-color: #131c2e !important;
                  }
                  .intramurals-dark-mode .border-slate-200,
                  .intramurals-dark-mode .border-slate-100 {
                    border-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .intramurals-dark-mode .text-slate-600,
                  .intramurals-dark-mode .text-slate-700,
                  .intramurals-dark-mode .text-slate-800,
                  .intramurals-dark-mode .text-slate-900 {
                    color: #e2e8f0 !important;
                  }
                  .intramurals-dark-mode .text-\\[\\#191970\\] {
                    color: #60a5fa !important;
                  }
                  .intramurals-dark-mode h1,
                  .intramurals-dark-mode h2,
                  .intramurals-dark-mode h3,
                  .intramurals-dark-mode h4 {
                    color: #ffffff !important;
                  }
                  .intramurals-dark-mode p,
                  .intramurals-dark-mode span:not([class*="text-"]) {
                    color: #cbd5e1 !important;
                  }
                  .intramurals-dark-mode table {
                    background: transparent !important;
                  }
                  .intramurals-dark-mode th,
                  .intramurals-dark-mode td {
                    color: #e2e8f0 !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .intramurals-dark-mode .card,
                  .intramurals-dark-mode [class*="Card"] {
                    background-color: #131c2e !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .intramurals-dark-mode tr:hover,
                  .intramurals-dark-mode tbody tr:hover {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                  }
                  .intramurals-dark-mode button:hover,
                  .intramurals-dark-mode [role="button"]:hover,
                  .intramurals-dark-mode a:hover {
                    background-color: rgba(59, 130, 246, 0.2) !important;
                    border-color: rgba(59, 130, 246, 0.3) !important;
                  }
                  .intramurals-dark-mode .hover\\:bg-slate-50:hover,
                  .intramurals-dark-mode .hover\\:bg-slate-100:hover,
                  .intramurals-dark-mode .hover\\:bg-white:hover {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                  }
                  .intramurals-dark-mode .hover\\:bg-blue-50:hover,
                  .intramurals-dark-mode .hover\\:bg-indigo-50:hover {
                    background-color: rgba(59, 130, 246, 0.15) !important;
                  }
                  .intramurals-dark-mode [class*="hover:bg-"]:hover {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                  }
                  .intramurals-dark-mode [class*="hover:text-"]:hover {
                    color: #60a5fa !important;
                  }
                  .intramurals-dark-mode .fixed {
                    background-color: rgba(0, 0, 0, 0.8) !important;
                  }
                  .intramurals-dark-mode .fixed .bg-white {
                    background-color: #131c2e !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .intramurals-dark-mode .fixed .border-slate-200,
                  .intramurals-dark-mode .fixed .border-slate-100 {
                    border-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .intramurals-dark-mode .fixed .bg-yellow-50 {
                    background-color: rgba(251, 191, 36, 0.15) !important;
                    border-color: rgba(251, 191, 36, 0.3) !important;
                  }
                  .intramurals-dark-mode .fixed .bg-slate-50 {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .intramurals-dark-mode .fixed .bg-amber-50 {
                    background-color: rgba(217, 119, 6, 0.15) !important;
                    border-color: rgba(217, 119, 6, 0.3) !important;
                  }
                  .intramurals-dark-mode .fixed .text-\\[\\#191970\\] {
                    color: #60a5fa !important;
                  }
                  .intramurals-dark-mode .fixed .text-slate-600,
                  .intramurals-dark-mode .fixed .text-slate-700,
                  .intramurals-dark-mode .fixed .text-slate-500 {
                    color: #cbd5e1 !important;
                  }
                  .intramurals-dark-mode .fixed h3,
                  .intramurals-dark-mode .fixed h4 {
                    color: #ffffff !important;
                  }
                  .intramurals-dark-mode .fixed table thead {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                  }
                  .intramurals-dark-mode .fixed table tbody tr {
                    border-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .intramurals-dark-mode .fixed table tbody tr:hover {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                  }
                  .intramurals-dark-mode .fixed button {
                    background-color: rgba(59, 130, 246, 0.2) !important;
                    border-color: rgba(59, 130, 246, 0.3) !important;
                    color: #ffffff !important;
                  }
                  .intramurals-dark-mode .fixed button:hover {
                    background-color: rgba(59, 130, 246, 0.3) !important;
                  }
                `}} />
                <div className="p-6 space-y-8 intramurals-dark-mode">
                  <AnnouncementsFeed limit={5} showTitle={true} />
                  <IntramuralsStandings />
                  <IntramuralsSchedule />
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>
      )}

      <Hero onGetStartedClick={openLoginModal} />
      <PublicFeedbackForm />
      <FeatureBento />
      <ValueProps />
      <Footer />

      {/* Login Modal rendered globally so it works in all modes */}
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </div>
  )
}
