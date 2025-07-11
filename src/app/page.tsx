"use client"

import { Suspense, useState } from "react"
import { Calendar, Users, FileText, Phone, Mail, AlertCircle, Bell, BookOpen, GraduationCap, Building, CheckCircle, ArrowRight, Star, Trophy, Clock, Target, Award, TrendingUp, BarChart, Sparkles, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { LoginModal } from "@/components/ui/login-modal"
import { SessionProvider } from "next-auth/react"

const reasons = [
  {
    icon: Trophy,
    title: "Academic Excellence",
    description: "Track and maintain outstanding academic performance with comprehensive grade monitoring and progress analytics that help you achieve your educational goals.",
    color: "text-[#191970]",
    bgColor: "bg-[#191970]/10",
    hoverColor: "hover:bg-[#191970]/20"
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description: "Get instant notifications about attendance, grades, schedules, and important university announcements through our connected platform.",
    color: "text-[#191970]", 
    bgColor: "bg-[#191970]/10",
    hoverColor: "hover:bg-[#191970]/20"
  },
  {
    icon: Target,
    title: "Goal Achievement",
    description: "Set academic goals, track milestones, and receive personalized recommendations for success with AI-powered insights and guidance.",
    color: "text-[#191970]",
    bgColor: "bg-[#191970]/10",
    hoverColor: "hover:bg-[#191970]/20"
  }
]

const systemFeatures = [
  {
    title: "Student Records Management",
    description: "Complete academic history, enrollment tracking, and comprehensive personal information management with secure cloud storage",
    icon: FileText,
    color: "text-[#191970]"
  },
  {
    title: "Smart Attendance Monitoring", 
    description: "Real-time attendance tracking with automated alerts, QR code scanning, and detailed reporting dashboard",
    icon: Calendar,
    color: "text-[#191970]"
  },
  {
    title: "Integrated Fee Management",
    description: "Seamless payment processing, billing history, installment plans, and financial tracking with multiple payment options",
    icon: BarChart,
    color: "text-[#191970]"
  },
  {
    title: "Advanced Progress Analytics",
    description: "Detailed insights into academic performance, predictive analytics, and personalized growth metrics with AI recommendations",
    icon: TrendingUp,
    color: "text-[#191970]"
  }
]

const stats = [
  { label: "Active Students", value: "15,000+", color: "text-[#191970]", bgColor: "bg-[#191970]/10" },
  { label: "Academic Programs", value: "200+", color: "text-[#191970]", bgColor: "bg-[#191970]/10" },
  { label: "Success Rate", value: "98.5%", color: "text-[#191970]", bgColor: "bg-[#191970]/10" },
  { label: "Faculty Members", value: "800+", color: "text-[#191970]", bgColor: "bg-[#191970]/10" }
]

const offerings = [
  "Comprehensive Student Information System",
  "Academic Performance Tracking & Analytics", 
  "Smart Attendance Management",
  "Integrated Fee Payment Solutions",
  "Progress Analytics & Detailed Reports",
  "Mobile Access & Push Notifications"
]

const additionalFeatures = [
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Enterprise-grade security with data encryption"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized performance for seamless experience"
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description: "Smart recommendations and predictive insights"
  }
]

export default function HomePage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const openLoginModal = () => setIsLoginModalOpen(true)
  const closeLoginModal = () => setIsLoginModalOpen(false)

  return (
    <SessionProvider>
      <div className="min-h-screen bg-white">
        {/* Enhanced Header */}
        <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-[#191970]/10 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-3 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#191970] to-[#191970]/80 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-[#191970]">BukSU Portal</span>
                    <p className="text-xs text-[#191970]/70 -mt-1">Student Excellence Platform</p>
                  </div>
                </div>
                <nav className="hidden lg:flex space-x-8">
                  <a href="#" className="text-slate-600 hover:text-[#191970] font-medium transition-colors duration-300 relative group">
                    Home
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#191970] transition-all duration-300 group-hover:w-full"></span>
                  </a>
                  <a href="#" className="text-slate-600 hover:text-[#191970] font-medium transition-colors duration-300 relative group">
                    Programs
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#191970] transition-all duration-300 group-hover:w-full"></span>
                  </a>
                  <a href="#" className="text-slate-600 hover:text-[#191970] font-medium transition-colors duration-300 relative group">
                    Admissions
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#191970] transition-all duration-300 group-hover:w-full"></span>
                  </a>
                  <a href="#" className="text-slate-600 hover:text-[#191970] font-medium transition-colors duration-300 relative group">
                    Student Life
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#191970] transition-all duration-300 group-hover:w-full"></span>
                  </a>
                  <a href="#" className="text-slate-600 hover:text-[#191970] font-medium transition-colors duration-300 relative group">
                    About
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#191970] transition-all duration-300 group-hover:w-full"></span>
                  </a>
                </nav>
              </div>
              <div className="flex items-center space-x-6">
                <Button 
                  onClick={openLoginModal}
                  className="bg-gradient-to-r from-[#191970] to-[#191970]/80 hover:from-[#191970]/90 hover:to-[#191970]/70 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  Student Login
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Hero Section */}
        <section className="relative bg-gradient-to-br from-[#191970]/10 via-white to-[#191970]/5 py-16 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-64 h-64 bg-[#191970]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#191970]/15 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#191970]/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <Badge className="bg-gradient-to-r from-[#191970] to-[#191970]/80 text-white font-semibold px-6 py-3 rounded-full text-sm shadow-lg">
                    ✨ Next-Generation University Platform
                  </Badge>
                  <h1 className="text-5xl lg:text-6xl font-bold text-[#191970] leading-tight">
                    Explore Your
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#191970] to-[#191970]/70">
                      Knowledge
                    </span>
                    <span className="block text-4xl lg:text-5xl">Start Your Journey</span>
                  </h1>
                  <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                    Embark on your academic excellence journey with our state-of-the-art student management platform. 
                    Track progress, manage courses, and unlock your full potential with AI-powered insights.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={openLoginModal}
                    size="lg" 
                    className="bg-gradient-to-r from-[#191970] to-[#191970]/80 hover:from-[#191970]/90 hover:to-[#191970]/70 text-white px-10 py-5 text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group"
                  >
                    Access Portal Now
                    <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                  <Button variant="outline" size="lg" className="border-2 border-[#191970] text-[#191970] hover:bg-[#191970]/5 px-10 py-5 text-lg font-bold rounded-xl transition-all duration-300 hover:border-[#191970]/80 hover:text-[#191970]/80">
                    Watch Demo
                    <span className="ml-2">🎥</span>
                  </Button>
                </div>
              </div>

              {/* Enhanced Hero Illustration */}
              <div className="relative">
                <div className="relative z-10">
                  <div className="relative w-full h-[450px] lg:h-[500px]">
                    {/* Main background circle */}
                    <div className="absolute top-8 right-8 w-80 h-80 lg:w-96 lg:h-96 bg-gradient-to-br from-[#191970] to-[#191970]/60 rounded-full opacity-20 animate-pulse"></div>
                    
                    {/* Student character container */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-80 h-96 bg-gradient-to-br from-white via-white to-[#191970]/5 rounded-3xl shadow-2xl flex items-center justify-center relative border border-[#191970]/10">
                        <div className="text-center space-y-6">
                          <div className="w-24 h-24 bg-gradient-to-br from-[#191970] to-[#191970]/80 rounded-full mx-auto flex items-center justify-center shadow-lg">
                            <GraduationCap className="w-14 h-14 text-white" />
                          </div>
                          <div className="w-20 h-24 bg-gradient-to-br from-[#fbbf24] to-[#fbbf24]/80 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                            <BookOpen className="w-10 h-10 text-white" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[#191970] font-bold text-xl">Student Portal</p>
                            <p className="text-slate-500 text-sm">Academic Excellence Hub</p>
                          </div>
                          
                          {/* Achievement badges */}
                          <div className="flex justify-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#dc2626] to-[#dc2626]/80 rounded-full flex items-center justify-center shadow-md">
                              <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#fbbf24]/80 rounded-full flex items-center justify-center shadow-md">
                              <Star className="w-6 h-6 text-white" />
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-[#191970] to-[#191970]/80 rounded-full flex items-center justify-center shadow-md">
                              <Award className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Floating elements */}
                        <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-[#191970] to-[#191970]/80 rounded-2xl flex items-center justify-center shadow-lg rotate-12">
                          <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-gradient-to-br from-[#191970] to-[#191970]/80 rounded-2xl flex items-center justify-center shadow-lg -rotate-12">
                          <BarChart className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Floating decorative elements */}
                    <div className="absolute top-20 left-20 w-8 h-8 bg-[#191970] rounded-full opacity-60 animate-bounce"></div>
                    <div className="absolute bottom-40 left-12 w-6 h-6 bg-[#fbbf24] rounded-full opacity-40 animate-pulse"></div>
                    <div className="absolute top-40 right-12 w-10 h-10 bg-[#dc2626] rounded-full opacity-30 animate-bounce delay-1000"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-16 bg-gradient-to-b from-white to-[#191970]/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge className="bg-[#191970] text-white px-6 py-3 rounded-full font-semibold mb-6">
                Why Choose BukSU Portal
              </Badge>
              <h2 className="text-4xl font-bold text-[#191970] mb-6 leading-tight">
                Reasons To Choose Our Platform
              </h2>
              <p className="text-lg text-slate-600 max-w-4xl mx-auto leading-relaxed">
                Our comprehensive student management system provides everything you need for academic success 
                and a seamless university experience powered by cutting-edge technology.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-12">
              {reasons.map((reason, index) => (
                <Card key={index} className={`text-center p-10 hover:shadow-2xl transition-all duration-500 border-0 bg-white shadow-lg group ${reason.hoverColor} transform hover:-translate-y-2`}>
                  <CardContent className="space-y-8">
                    <div className={`w-24 h-24 ${reason.bgColor} rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <reason.icon className={`w-12 h-12 ${reason.color}`} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-[#191970] group-hover:text-[#fbbf24] transition-colors duration-300">{reason.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{reason.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Additional Features */}
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {additionalFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-4 p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#191970]/10">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#191970] to-[#191970]/80 rounded-xl flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#191970]">{feature.title}</h4>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enhanced Features Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <Badge className="bg-gradient-to-r from-[#191970] to-[#191970]/80 text-white px-6 py-3 rounded-full font-semibold">
                    🚀 Comprehensive System
                  </Badge>
                  <h2 className="text-4xl font-bold text-[#191970] leading-tight">
                    Find Your Preferred Services
                    <span className="block text-[#fbbf24]">& Improve Your Skills</span>
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    Our integrated platform streamlines every aspect of your university experience, 
                    from enrollment to graduation, ensuring you stay focused on what matters most - your academic excellence.
                  </p>
                </div>

                <div className="space-y-6">
                  {systemFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-6 p-6 rounded-2xl hover:bg-[#191970]/5 transition-all duration-300 group">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-[#191970]/10 group-hover:scale-110 transition-transform duration-300">
                          <feature.icon className={`w-8 h-8 ${feature.color}`} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xl font-bold text-[#191970] group-hover:text-[#191970]/80 transition-colors duration-300">{feature.title}</h4>
                        <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={openLoginModal}
                  size="lg" 
                  className="bg-gradient-to-r from-[#191970] to-[#191970]/80 hover:from-[#191970]/90 hover:to-[#191970]/70 text-white px-10 py-4 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group"
                >
                  Explore All Features
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </div>

              {/* Enhanced Features Illustration */}
              <div className="relative">
                <div className="relative z-10">
                  <div className="w-full h-[450px] bg-gradient-to-br from-[#191970]/20 via-[#191970]/10 to-[#191970]/5 rounded-3xl flex items-center justify-center shadow-2xl border border-[#191970]/10">
                    <div className="text-center space-y-8">
                      <div className="w-32 h-32 bg-gradient-to-br from-[#191970] to-[#191970]/80 rounded-3xl mx-auto flex items-center justify-center shadow-xl">
                        <Users className="w-16 h-16 text-white" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-3xl font-bold text-[#191970]">Student Dashboard</h3>
                        <p className="text-[#fbbf24] font-semibold text-lg">All-in-one portal access</p>
                      </div>
                      
                      {/* Feature icons grid */}
                      <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto pt-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#191970] to-[#191970]/80 rounded-2xl flex items-center justify-center shadow-lg">
                          <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <div className="w-16 h-16 bg-gradient-to-br from-[#fbbf24] to-[#fbbf24]/80 rounded-2xl flex items-center justify-center shadow-lg">
                          <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div className="w-16 h-16 bg-gradient-to-br from-[#dc2626] to-[#dc2626]/80 rounded-2xl flex items-center justify-center shadow-lg">
                          <BarChart className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Background decorative elements */}
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#191970]/20 rounded-3xl blur-xl"></div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#191970]/15 rounded-3xl blur-xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-gradient-to-br from-[#191970]/10 to-white">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Enhanced Stats Illustration */}
              <div className="relative">
                <div className="bg-gradient-to-br from-white via-[#191970]/5 to-[#191970]/10 rounded-3xl p-8 shadow-2xl border border-[#191970]/10">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-[#191970] to-[#191970]/80 rounded-3xl mx-auto flex items-center justify-center shadow-xl">
                      <BarChart className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#191970]">University Statistics</h3>
                    
                    {/* Enhanced chart representation */}
                    <div className="space-y-4">
                      <div className="flex items-end justify-center space-x-3 h-28">
                        <div className="w-6 bg-gradient-to-t from-[#191970] to-[#191970]/60 h-16 rounded-t-lg"></div>
                        <div className="w-6 bg-gradient-to-t from-[#191970] to-[#191970]/60 h-24 rounded-t-lg"></div>
                        <div className="w-6 bg-gradient-to-t from-[#191970] to-[#191970]/60 h-20 rounded-t-lg"></div>
                        <div className="w-6 bg-gradient-to-t from-[#191970] to-[#fbbf24] h-28 rounded-t-lg"></div>
                        <div className="w-6 bg-gradient-to-t from-[#191970] to-[#dc2626] h-12 rounded-t-lg"></div>
                      </div>
                      <p className="text-slate-600 text-sm">Live performance metrics</p>
                    </div>
                  </div>
                </div>

                {/* Background decorative elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#191970]/20 rounded-full blur-xl"></div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-[#191970]/15 rounded-full blur-xl"></div>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  <Badge className="bg-gradient-to-r from-[#191970] to-[#191970]/80 text-white px-6 py-3 rounded-full font-semibold">
                    📊 Our Impact
                  </Badge>
                  <h2 className="text-4xl font-bold text-[#191970] leading-tight">
                    What Kind Of Services Our
                    <span className="block text-[#fbbf24]">Learning Platform Offers</span>
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    BukSU&apos;s student management system serves thousands of students across multiple programs, 
                    providing comprehensive digital services that enhance the educational experience.
                  </p>
                </div>

                {/* Enhanced Statistics Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className={`text-center space-y-4 p-6 ${stat.bgColor} rounded-2xl hover:scale-105 transition-transform duration-300`}>
                      <div className={`text-4xl font-bold ${stat.color}`}>
                        {stat.value}
                      </div>
                      <p className="text-[#191970] font-semibold">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-5">
                  {offerings.slice(0, 3).map((offering, index) => (
                    <div key={index} className="flex items-center space-x-4 group">
                      <CheckCircle className="w-6 h-6 text-[#191970] flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                      <p className="text-slate-700 font-medium group-hover:text-[#191970] transition-colors duration-300">{offering}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced CTA Section */}
        <section className="py-16 bg-gradient-to-r from-[#191970] via-[#191970]/90 to-[#191970] relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 border border-white rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 border border-white rounded-full"></div>
            <div className="absolute top-1/2 left-1/4 w-24 h-24 border border-[#fbbf24] rounded-full"></div>
          </div>

          <div className="container mx-auto px-4 text-center relative">
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="space-y-6">
                <Badge className="bg-[#fbbf24] text-white px-6 py-3 rounded-full font-semibold">
                  🎓 What We Offer
                </Badge>
                <h2 className="text-4xl font-bold text-white leading-tight">
                  Experience The Future Of
                  <span className="block text-[#fbbf24]">University Education</span>
                </h2>
                <p className="text-lg text-blue-100 leading-relaxed">
                  Join thousands of students who have transformed their academic journey with our comprehensive 
                  digital platform designed to support excellence from enrollment to graduation.
                </p>
              </div>
               
              <div className="grid md:grid-cols-2 gap-6 mt-12">
                {offerings.map((offering, index) => (
                  <div key={index} className="flex items-center space-x-4 text-left p-4 rounded-xl hover:bg-white/10 transition-all duration-300 group">
                    <CheckCircle className="w-6 h-6 text-[#fbbf24] flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                    <p className="text-white font-medium group-hover:text-[#fbbf24] transition-colors duration-300">{offering}</p>
                  </div>
                ))}
              </div>

              <div className="pt-8">
                <Button 
                  onClick={openLoginModal}
                  size="lg" 
                  className="bg-white text-[#191970] hover:bg-[#fbbf24] hover:text-white px-16 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group"
                >
                  Start Your Journey Today
                  <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Footer */}
        <footer className="py-12 bg-[#191970] text-white relative">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-12">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#fbbf24]/80 rounded-xl flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-white">BukSU Portal</span>
                    <p className="text-sm text-blue-200">Excellence Platform</p>
                  </div>
                </div>
                <p className="text-blue-200 leading-relaxed">
                  Official student information system of Bukidnon State University, empowering academic excellence 
                  through innovative technology and comprehensive educational support.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold mb-6 text-[#fbbf24] text-lg">Quick Links</h4>
                <div className="space-y-3 text-blue-200">
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Student Portal</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Academic Calendar</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Fee Payment</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Course Catalog</a></p>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold mb-6 text-[#fbbf24] text-lg">Student Services</h4>
                <div className="space-y-3 text-blue-200">
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Enrollment</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Attendance Tracking</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Grade Monitoring</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Financial Services</a></p>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold mb-6 text-[#fbbf24] text-lg">Support</h4>
                <div className="space-y-3 text-blue-200">
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Help Center</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Technical Support</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Student Guide</a></p>
                  <p><a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Contact Us</a></p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/20 pt-8 mt-12">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <p className="text-blue-200 text-sm">
                  © 2025 AOG Tech. All rights reserved.
                </p>
                <div className="flex items-center space-x-6 text-blue-200 text-sm">
                  <a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Privacy Policy</a>
                  <a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Terms of Service</a>
                  <a href="#" className="hover:text-[#fbbf24] transition-colors duration-300">Accessibility</a>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Login Modal */}
        <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
      </div>
    </SessionProvider>
  )
}
