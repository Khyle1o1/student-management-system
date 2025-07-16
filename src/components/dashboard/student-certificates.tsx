"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, MapPin, Download, FileText, CheckCircle, Clock, AlertCircle, Star, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface Certificate {
  id: string
  event_id: string
  student_id: string
  certificate_type: string
  generated_at: string
  is_accessible: boolean
  certificate_number: string
  event: {
    id: string
    title: string
    date: string
    location?: string
    require_evaluation: boolean
  }
  evaluationStatus: {
    required: boolean
    completed: boolean
    submittedAt: string | null
  }
  hasEvaluation: boolean
}

interface StudentCertificatesProps {
  studentId: string | null
}

export function StudentCertificates({ studentId }: StudentCertificatesProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [viewingIds, setViewingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCertificates()
    
    // Auto-refresh when window regains focus (useful when coming back from evaluation)
    const handleFocus = () => {
      fetchCertificates()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [studentId])

  const fetchCertificates = async () => {
    try {
      setError(null)
      const response = await fetch('/api/certificates')
      
      if (!response.ok) {
        throw new Error('Failed to fetch certificates')
      }
      
      const data = await response.json()
      setCertificates(data.certificates || [])
    } catch (error) {
      console.error('Error fetching certificates:', error)
      setError(error instanceof Error ? error.message : 'Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchCertificates()
    setRefreshing(false)
  }

  const handleDownload = async (certificateId: string) => {
    if (downloadingIds.has(certificateId)) {
      return // Already downloading
    }
    
    setDownloadingIds(prev => new Set(prev).add(certificateId))
    
    try {
      console.log('Starting download for certificate:', certificateId)
      
      // Add cache-busting timestamp
      const timestamp = Date.now()
      const url = `/api/certificates/${certificateId}?action=download&t=${timestamp}`
      
      console.log('Request URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response statusText:', response.statusText)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText)
        
        // Try to get the error message from the response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error('Server error:', errorData)
        } catch (e) {
          console.error('Could not parse error response:', e)
        }
        throw new Error(errorMessage)
      }
      
      // Check if response has content
      const contentLength = response.headers.get('content-length')
      const contentType = response.headers.get('content-type')
      
      console.log('Content details:', {
        contentLength,
        contentType,
        hasBody: response.body !== null
      })
      
      // Be more lenient with content validation to handle IDM interference
      if (response.status === 204 && response.statusText.includes('IDM')) {
        throw new Error('Download intercepted by IDM. Please disable IDM for localhost or use a different browser.')
      }
      
      if (!contentType || !contentType.includes('application/pdf')) {
        if (response.status === 200) {
          console.warn('Missing content-type but status is 200, proceeding anyway')
        } else {
          throw new Error(`Invalid response: content-length=${contentLength}, content-type=${contentType}`)
        }
      }
      
      const blob = await response.blob()
      console.log('Blob received:', {
        size: blob.size,
        type: blob.type
      })
      
      // Check if blob is valid
      if (blob.size === 0) {
        throw new Error('Certificate file is empty')
      }
      
      // For any blob with content, try to download it
      if (blob.size > 0) {
        console.log('Proceeding with download despite potential type mismatch')
        
        // Create download link
        const objectUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = `certificate-${certificateId}.pdf`
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(objectUrl)
        
        console.log('Download completed successfully')
      } else {
        throw new Error('No content received')
      }
    } catch (error) {
      console.error('Error downloading certificate:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to download certificate'
      alert(`Download failed: ${errorMessage}`)
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(certificateId)
        return newSet
      })
    }
  }

  const handleViewCertificate = async (certificateId: string) => {
    if (viewingIds.has(certificateId)) {
      return // Already viewing
    }
    
    setViewingIds(prev => new Set(prev).add(certificateId))
    
    try {
      // Open certificate in new tab for viewing (inline)
      window.open(`/api/certificates/${certificateId}?action=view`, '_blank')
    } catch (error) {
      console.error('Error viewing certificate:', error)
      alert('Failed to open certificate')
    } finally {
      // Clear viewing state after a short delay
      setTimeout(() => {
        setViewingIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(certificateId)
          return newSet
        })
      }, 1000)
    }
  }

  const getCertificateStatus = (cert: Certificate) => {
    if (!cert.event.require_evaluation) {
      return {
        status: 'ready',
        label: 'Ready to Download',
        color: 'bg-green-500',
        icon: CheckCircle
      }
    }

    if (cert.evaluationStatus.completed) {
      return {
        status: 'ready',
        label: 'Ready to Download',
        color: 'bg-green-500',
        icon: CheckCircle
      }
    }

    return {
      status: 'pending',
      label: 'Evaluation Required',
      color: 'bg-yellow-500',
      icon: AlertCircle
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading certificates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Certificates</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchCertificates} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (certificates.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
            <p className="text-muted-foreground">
              Certificates will appear here after you attend events and they are processed by the system.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ready to Download</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {certificates.filter(cert => cert.is_accessible).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {certificates.filter(cert => cert.event.require_evaluation && !cert.evaluationStatus.completed).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Certificates</h2>
        <Button 
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Certificates List */}
      <div className="space-y-4">
        {certificates.map((cert) => {
          const statusInfo = getCertificateStatus(cert)
          const StatusIcon = statusInfo.icon
          
          return (
            <Card key={cert.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{cert.event.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(cert.event.date), 'PPP')}
                      </span>
                      {cert.event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {cert.event.location}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      #{cert.certificate_number}
                    </Badge>
                    <Badge 
                      variant={statusInfo.status === 'ready' ? 'default' : 'secondary'}
                      className={`text-xs ${statusInfo.color} text-white`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Certificate Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Certificate Type</div>
                      <div className="capitalize">{cert.certificate_type.toLowerCase()}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Generated</div>
                      <div>{format(new Date(cert.generated_at), 'PPp')}</div>
                    </div>
                  </div>

                  {/* Evaluation Status */}
                  {cert.event.require_evaluation && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Evaluation Required</span>
                      </div>
                      
                      {cert.evaluationStatus.completed ? (
                        <div className="text-sm text-green-600">
                          ✓ Completed on {format(new Date(cert.evaluationStatus.submittedAt!), 'PPp')}
                        </div>
                      ) : (
                        <div className="text-sm text-yellow-600">
                          ⏳ Please complete the evaluation to access your certificate
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    {cert.is_accessible ? (
                      <Button 
                        onClick={() => handleDownload(cert.id)}
                        className="flex items-center gap-2"
                        disabled={downloadingIds.has(cert.id)}
                      >
                        <Download className="h-4 w-4" />
                        {downloadingIds.has(cert.id) ? 'Downloading...' : 'Download Certificate'}
                      </Button>
                    ) : (
                      cert.event.require_evaluation && !cert.evaluationStatus.completed ? (
                        <Button asChild>
                          <Link href={`/dashboard/events/${cert.event.id}/evaluation`}>
                            <Star className="h-4 w-4 mr-2" />
                            Complete Evaluation
                          </Link>
                        </Button>
                      ) : (
                        <Button disabled variant="outline">
                          <Clock className="h-4 w-4 mr-2" />
                          Processing...
                        </Button>
                      )
                    )}
                    
                    {cert.is_accessible && (
                      <Button 
                        variant="outline"
                        onClick={() => handleViewCertificate(cert.id)}
                        disabled={viewingIds.has(cert.id)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {viewingIds.has(cert.id) ? 'Viewing...' : 'View Certificate'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 