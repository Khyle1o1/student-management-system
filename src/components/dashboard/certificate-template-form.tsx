"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Save, 
  Palette, 
  Settings,
  X,
  Upload,
  Image,
  Loader2,
  FileImage,
  Download
} from "lucide-react"

interface BackgroundDesign {
  background_color: string
  border_color: string
  border_width: number
  logo_url?: string
  logo_position: "top-left" | "top-center" | "top-right" | "center"
  pattern: "none" | "watermark" | "border-pattern"
  certificate_background?: string // Full certificate background image
  design_type: "custom" | "image" // New field to track design type
}

interface CertificateTemplateFormProps {
  templateId?: string
  initialData?: any
}

export function CertificateTemplateForm({ templateId, initialData }: CertificateTemplateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [downloadingSample, setDownloadingSample] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_active: true,
  })

  const [backgroundDesign, setBackgroundDesign] = useState<BackgroundDesign>({
    background_color: "#ffffff",
    border_color: "#000000",
    border_width: 2,
    logo_url: "",
    logo_position: "top-center" as const,
    pattern: "none" as const,
    certificate_background: "",
    design_type: "image" as const, // Default to image-based
  })

  const isEditing = !!templateId

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
      })
      setBackgroundDesign(initialData.background_design ? {
        ...initialData.background_design,
        design_type: initialData.background_design?.design_type || "custom"
      } : backgroundDesign)
    }
  }, [initialData])

  const handleLogoUpload = async (file: File) => {
    if (!file) return

    setUploadingLogo(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setBackgroundDesign(prev => ({ ...prev, logo_url: data.url }))
      } else {
        alert(`Error uploading logo: ${data.error}`)
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Failed to upload logo. Please try again.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleBackgroundUpload = async (file: File) => {
    if (!file) return

    setUploadingBackground(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setBackgroundDesign(prev => ({ 
          ...prev, 
          certificate_background: data.url,
          design_type: "image"
        }))
        
        // Add default fields for image-based certificates
        // This logic is now handled by the backend or a separate component
      } else {
        alert(`Error uploading background: ${data.error}`)
      }
    } catch (error) {
      console.error('Error uploading background:', error)
      alert('Failed to upload background. Please try again.')
    } finally {
      setUploadingBackground(false)
    }
  }

  const handleLogoRemove = () => {
    setBackgroundDesign(prev => ({ ...prev, logo_url: "" }))
  }

  const handleBackgroundRemove = () => {
    setBackgroundDesign(prev => ({ 
      ...prev, 
      certificate_background: "",
      design_type: "custom"
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert("Template title is required")
      return
    }

    setSaving(true)

    try {
      const templateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        background_design: backgroundDesign,
        is_active: formData.is_active,
      }

      const url = isEditing ? `/api/certificate-templates/${templateId}` : '/api/certificate-templates'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      })

      const data = await response.json()
      
      if (response.ok) {
        router.push('/dashboard/certificates/templates')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('An error occurred while saving the template')
    } finally {
      setSaving(false)
    }
  }

  const handleSampleDownload = async () => {
    if (!templateId) {
      alert("Please save the template first before downloading a sample")
      return
    }

    setDownloadingSample(true)
    
    try {
      const response = await fetch(`/api/certificate-templates/${templateId}/sample`, {
        method: 'GET',
      })

      if (response.ok) {
        // Get the filename from the response headers
        const contentDisposition = response.headers.get('content-disposition')
        let filename = 'sample-certificate.pdf'
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }

        // Create blob and download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        alert(`Error downloading sample: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error downloading sample:', error)
      alert('Failed to download sample certificate')
    } finally {
      setDownloadingSample(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Set the basic details for your certificate template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Template Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Participation Certificate"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the template"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active">Active template</Label>
            </div>
          </CardContent>
        </Card>

        {/* Design Configuration */}
        <Tabs defaultValue="background" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="background" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Background
            </TabsTrigger>
          </TabsList>

          {/* Background Design */}
          <TabsContent value="background">
            <Card>
              <CardHeader>
                <CardTitle>Certificate Design</CardTitle>
                <CardDescription>
                  Upload your certificate background image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Design Type Selector */}
                <div className="space-y-4">
                  <Label>Design Type</Label>
                  <div className="grid grid-cols-1 gap-4">
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        backgroundDesign.design_type === "image" 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setBackgroundDesign(prev => ({ ...prev, design_type: "image" }))}
                    >
                      <div className="flex items-center space-x-3">
                        <FileImage className="h-8 w-8 text-blue-600" />
                        <div>
                          <h3 className="font-semibold">Upload Certificate Image</h3>
                          <p className="text-sm text-gray-600">
                            Upload a complete certificate design. Student name and certificate number will be automatically positioned.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <Label htmlFor="background_upload">Certificate Background Image</Label>
                  
                  {backgroundDesign.certificate_background ? (
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border">
                        <img
                          src={backgroundDesign.certificate_background}
                          alt="Certificate background"
                          className="w-32 h-24 object-contain border rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Certificate background uploaded</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {backgroundDesign.certificate_background.split('/').pop()}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Ready to generate certificates
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleBackgroundRemove}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleBackgroundUpload(file)
                          }}
                          className="hidden"
                          id="background_replace"
                        />
                        <Label htmlFor="background_replace" className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingBackground}
                            asChild
                          >
                            <span>
                              {uploadingBackground ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Replace Background
                            </span>
                          </Button>
                        </Label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const file = e.dataTransfer.files[0]
                          if (file && file.type.startsWith('image/')) {
                            handleBackgroundUpload(file)
                          }
                        }}
                      >
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleBackgroundUpload(file)
                          }}
                          className="hidden"
                          id="background_upload"
                        />
                        <Label htmlFor="background_upload" className="cursor-pointer">
                          <div className="flex flex-col items-center space-y-3">
                            {uploadingBackground ? (
                              <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
                            ) : (
                              <FileImage className="h-12 w-12 text-gray-400" />
                            )}
                            <div>
                              <p className="text-lg font-medium text-gray-900">
                                {uploadingBackground ? 'Uploading...' : 'Upload Certificate Background'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Drag and drop your certificate image here, or click to browse
                              </p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                              <p className="text-sm text-blue-700 font-medium">
                                💡 Upload your complete certificate design
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                Student name and certificate number will be automatically positioned
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {templateId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSampleDownload}
                disabled={downloadingSample}
                className="flex items-center gap-2"
              >
                {downloadingSample ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingSample ? 'Generating...' : 'Download Sample'}
              </Button>
            )}
            {!templateId && (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Save template first to download sample
              </div>
            )}
          </div>
          
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/certificates/templates')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update' : 'Create'} Template
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
} 