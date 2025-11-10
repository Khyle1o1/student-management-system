"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Save, 
  Upload,
  Loader2,
  FileImage,
  Eye,
  X
} from "lucide-react"

interface CertificateTemplateCreatorProps {
  templateId?: string
  initialData?: any
}

// Predefined text configuration
const TEXT_CONFIG = {
  fontFamily: "Poppins",
  fontSize: 80,
  fontColor: "#000000",
  textAlign: "center" as const,
  fontWeight: "bold" as const,
  namePosition: { x: 1000, y: 650 }, // Center of 2000px width template
  certNumberPosition: { x: 550, y: 200 }, // Top of 1414px height template
  certNumberFontSize: 30,
  certNumberFontWeight: "normal" as const
}

export function CertificateTemplateCreatorSimple({ templateId, initialData }: CertificateTemplateCreatorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>("")
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_active: true,
  })

  const isEditing = !!templateId

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title ?? "",
        description: initialData.description ?? "",
        is_active: initialData.is_active !== undefined ? Boolean(initialData.is_active) : true,
      })
      if (initialData.background_design?.certificate_background) {
        setBackgroundImageUrl(initialData.background_design.certificate_background)
      }
    }
  }, [initialData])

  // Generate preview with sample data
  useEffect(() => {
    if (backgroundImageUrl && previewCanvasRef.current) {
      // Small delay to ensure canvas is ready
      const timer = setTimeout(() => {
        drawPreview()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [backgroundImageUrl])

  const handleImageUpload = async (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
      alert("Please upload a PNG or JPG image")
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setBackgroundImageUrl(data.url)
      } else {
        alert(`Error uploading image: ${data.error}`)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const drawPreview = () => {
    if (!previewCanvasRef.current || !backgroundImageUrl) return

    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // A4 Landscape dimensions in pixels (at 96 DPI)
    // For better preview, use a reasonable display size
    const displayWidth = 800 // Display width for preview
    const aspectRatio = 297 / 210 // A4 landscape aspect ratio
    const displayHeight = displayWidth / aspectRatio
    
    canvas.width = displayWidth
    canvas.height = displayHeight
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    // Load and draw background image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw image to fit canvas while maintaining aspect ratio
      const imgAspect = img.width / img.height
      const canvasAspect = displayWidth / displayHeight
      
      let drawWidth = displayWidth
      let drawHeight = displayHeight
      let drawX = 0
      let drawY = 0
      
      if (imgAspect > canvasAspect) {
        // Image is wider, fit to height
        drawHeight = displayHeight
        drawWidth = drawHeight * imgAspect
        drawX = (displayWidth - drawWidth) / 2
      } else {
        // Image is taller, fit to width
        drawWidth = displayWidth
        drawHeight = drawWidth / imgAspect
        drawY = (displayHeight - drawHeight) / 2
      }
      
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      
      // Calculate scale factors from template coordinates (2000x1414) to canvas
      const scaleX = displayWidth / 2000
      const scaleY = displayHeight / 1414
      
      // Scale font size for preview
      const previewFontSize = TEXT_CONFIG.fontSize * scaleX
      
      // Draw sample name
      const fontWeight = TEXT_CONFIG.fontWeight === 'bold' ? 'bold' : 'normal'
      ctx.font = `${fontWeight} ${previewFontSize}px ${TEXT_CONFIG.fontFamily}, Arial, sans-serif`
      ctx.fillStyle = TEXT_CONFIG.fontColor
      ctx.textAlign = TEXT_CONFIG.textAlign as CanvasTextAlign
      ctx.textBaseline = 'middle'
      
      const nameX = TEXT_CONFIG.namePosition.x * scaleX
      const nameY = TEXT_CONFIG.namePosition.y * scaleY
      const certX = TEXT_CONFIG.certNumberPosition.x * scaleX
      const certY = TEXT_CONFIG.certNumberPosition.y * scaleY
      
      // Draw sample name
      ctx.fillText("Juan Dela Cruz", nameX, nameY)
      
      // Draw sample certificate number with different font size and weight
      const certFontSize = TEXT_CONFIG.certNumberFontSize * scaleX
      ctx.font = `${TEXT_CONFIG.certNumberFontWeight} ${certFontSize}px ${TEXT_CONFIG.fontFamily}, Arial, sans-serif`
      ctx.fillText("CERT-0001", certX, certY)
    }
    img.onerror = () => {
      console.error('Failed to load preview image')
      // Draw error message on canvas
      ctx.fillStyle = '#ff0000'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Failed to load image', canvas.width / 2, canvas.height / 2)
    }
    
    // Handle both relative and absolute URLs
    if (backgroundImageUrl.startsWith('/')) {
      img.src = backgroundImageUrl
    } else if (backgroundImageUrl.startsWith('http')) {
      img.src = backgroundImageUrl
    } else {
      img.src = `/${backgroundImageUrl}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert("Template title is required")
      return
    }

    if (!backgroundImageUrl) {
      alert("Please upload a certificate background image")
      return
    }

    setSaving(true)

    try {
      // The API will automatically add the predefined fields
      const templateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        background_design: {
          certificate_background: backgroundImageUrl,
          design_type: "image" as const,
          // Keep other fields for compatibility
          background_color: "#ffffff",
          border_color: "#000000",
          border_width: 0,
          logo_position: "top-center" as const,
          pattern: "none" as const,
        },
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
        alert(`Error: ${data.error || 'Failed to save template'}`)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('An error occurred while saving the template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
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

        {/* Image Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Certificate Background</CardTitle>
            <CardDescription>
              Upload your certificate background image (PNG or JPG). The student name and certificate number will be automatically positioned.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {backgroundImageUrl ? (
              <div className="space-y-4">
                <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={backgroundImageUrl}
                    alt="Certificate background"
                    className="w-full h-auto max-h-[500px] object-contain mx-auto"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Background image uploaded</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {backgroundImageUrl.split('/').pop()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBackgroundImageUrl("")
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                    className="hidden"
                    id="background_replace"
                  />
                  <Label htmlFor="background_replace" className="cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Replace Image
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
                      handleImageUpload(file)
                    }
                  }}
                >
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                    className="hidden"
                    id="background_upload"
                  />
                  <Label htmlFor="background_upload" className="cursor-pointer">
                    <div className="flex flex-col items-center space-y-3">
                      {uploading ? (
                        <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
                      ) : (
                        <FileImage className="h-12 w-12 text-gray-400" />
                      )}
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          {uploading ? 'Uploading...' : 'Upload Certificate Background'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Drag and drop your image here, or click to browse
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          PNG or JPG format only
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Section */}
        {backgroundImageUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview
              </CardTitle>
              <CardDescription>
                Preview how the certificate will look with sample data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="relative">
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-auto border rounded bg-white shadow-sm"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Sample Data:</strong> Name: &quot;Juan Dela Cruz&quot;, Certificate Number: &quot;CERT-0001&quot;
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Text positions are fixed: Name at (1000px, 650px) - 80px bold, Certificate Number at (1000px, 1300px) - 30px normal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Text Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle>Text Configuration</CardTitle>
            <CardDescription>
              Predefined text settings (fixed and cannot be changed)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Name Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Input value={TEXT_CONFIG.fontFamily} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Input value={`${TEXT_CONFIG.fontSize}px`} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Weight</Label>
                    <Input value={TEXT_CONFIG.fontWeight} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Color</Label>
                    <Input value={TEXT_CONFIG.fontColor} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Text Alignment</Label>
                    <Input value={TEXT_CONFIG.textAlign} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input value={`X: ${TEXT_CONFIG.namePosition.x}px, Y: ${TEXT_CONFIG.namePosition.y}px`} disabled />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Certificate Number Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Input value={TEXT_CONFIG.fontFamily} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Input value={`${TEXT_CONFIG.certNumberFontSize}px`} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Weight</Label>
                    <Input value={TEXT_CONFIG.certNumberFontWeight} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Color</Label>
                    <Input value={TEXT_CONFIG.fontColor} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Text Alignment</Label>
                    <Input value={TEXT_CONFIG.textAlign} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input value={`X: ${TEXT_CONFIG.certNumberPosition.x}px, Y: ${TEXT_CONFIG.certNumberPosition.y}px`} disabled />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/certificates/templates')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !backgroundImageUrl}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

