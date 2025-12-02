"use client"

import { useEffect, useState } from "react"
import { Calendar, Users, FileText, Phone, Mail, AlertCircle, Bell, BookOpen, GraduationCap, Building, CheckCircle, ArrowRight, Star, Trophy, Clock, Target, Award, TrendingUp, BarChart, Sparkles, Shield, Zap } from "lucide-react"
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
                    <span className="text-2xl font-bold text-[#191970]">Smart-U Portal</span>
                    <p className="text-xs text-[#191970]/70 -mt-1">Smart Solutions for a Smarter BukSU</p>
                  </div>
                </div>
               
              </div>
              <div className="flex items-center space-x-6">
                <Button 
                  onClick={openLoginModal}
                  className="bg-gradient-to-r from-[#191970] to-[#191970]/80 hover:from-[#191970]/90 hover:to-[#191970]/70 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  Login
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Intramurals content (shown on top when enabled) */}
        {isVisible && !visibilityLoading && (
          <main>
            <IntramuralsStandings />
            <IntramuralsSchedule />
          </main>
        )}

        <>

        {/* Team Section */}


        </>

        {/* Enhanced Footer - always visible on homepage in all modes */}
        <footer className="py-12 bg-[#191970] text-white relative">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-12">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#fbbf24]/80 rounded-xl flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-white">Smart-U Portal</span>
                    <p className="text-xs text-blue-200">Smart Solutions for a Smarter BukSU</p>
                  </div>
                </div>
                <p className="text-blue-200 leading-relaxed">
                  Official student information system of Bukidnon State University, empowering academic excellence 
                  through innovative technology and comprehensive educational support.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold mb-6 text-[#fbbf24] text-lg">Socials</h4>
                <div className="space-y-3 text-blue-200">
                  <p>
                    <a
                      href="https://facebook.com/"
                      target="https://www.facebook.com/BUKSUSSC"
                      rel="noopener noreferrer"
                      className="hover:text-[#fbbf24] transition-colors duration-300"
                    >
                      Facebook
                    </a>
                  </p>
                  <p>
                    <a
                      href="ssc@buksu.edu.ph"
                      className="hover:text-[#fbbf24] transition-colors duration-300"
                    >
                      Gmail
                    </a>
                  </p>
                  <p className="text-blue-200">
                   Fortich St. Malaybalay City, Bukidnon
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold mb-6 text-[#fbbf24] text-lg">Developer</h4>
                <div className="space-y-3 text-blue-200">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-700 border-2 border-[#fbbf24] flex items-center justify-center text-xs text-blue-100 overflow-hidden">
                      <img src="/khyle.jpg" alt="Khyle Ivan khim V. Amacna" className="w-full h-full object-cover rounded-full" />
                    </div>
                    <div>
                      <p>Khyle Ivan khim V. Amacna</p>
                      <p className="text-sm text-blue-300">System Developer</p>
                    </div>
                  </div>
                  <p>aogtech.ph@gmail.com</p>
                  <p>
                    <a
                      href="https://github.com/yourhandle"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#fbbf24] transition-colors duration-300"
                    >
                      
                    </a>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/20 pt-8 mt-12">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <p className="text-blue-200 text-sm">
                  © by Angel Of God Tech 2025. All rights reserved.
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

        {/* Login Modal rendered globally so it works in all modes */}
        <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
      </div>
    )
  }
