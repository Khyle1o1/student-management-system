"use client"

export function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating Circles */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/10 rounded-full animate-pulse" />
      <div className="absolute top-40 right-20 w-16 h-16 bg-purple-500/10 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-20 w-24 h-24 bg-pink-500/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-20 right-10 w-12 h-12 bg-cyan-500/10 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
      
      {/* Floating Squares */}
      <div className="absolute top-60 left-1/4 w-8 h-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rotate-45 animate-spin" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-60 right-1/4 w-6 h-6 bg-gradient-to-r from-green-500/20 to-blue-500/20 rotate-12 animate-spin" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:50px_50px] dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]" />
    </div>
  )
} 