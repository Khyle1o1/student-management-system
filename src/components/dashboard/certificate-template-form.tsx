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
  Plus, 
  Trash2, 
  Move, 
  Eye, 
  Save, 
  Palette, 
  Type, 
  Settings,
  MousePointer,
  X,
  Upload,
  Image,
  Loader2,
  FileImage
} from "lucide-react"

interface DynamicField {
  id: string
  type: "student_name" | "event_name" | "event_date" | "certificate_number" | "institution_name" | "custom_text"
  label: string
  position: { x: number; y: number }
  style: {
    font_family: string
    font_size: number
    font_weight: "normal" | "bold"
    color: string
    text_align: "left" | "center" | "right"
  }
  custom_text?: string
}

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
  const [showPreview, setShowPreview] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  
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
    design_type: "custom" as const,
  })

  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [draggedField, setDraggedField] = useState<string | null>(null)

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
      setDynamicFields(initialData.dynamic_fields || [])
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
        if (dynamicFields.length === 0) {
          const defaultFields: DynamicField[] = [
            {
              id: `field-${Date.now()}-1`,
              type: "student_name",
              label: "Student Name",
              position: { x: 1000, y: 990 }, // Centered position for name (scaled from 400,420)
              style: {
                font_family: "Arial",
                font_size: 60,
                font_weight: "bold",
                color: "#000000",
                text_align: "center",
              },
            },
            {
              id: `field-${Date.now()}-2`,
              type: "certificate_number",
              label: "Certificate Number",
              position: { x: 250, y: 1296 }, // Bottom left for cert number (scaled from 100,550)
              style: {
                font_family: "Arial",
                font_size: 30,
                font_weight: "normal",
                color: "#000000",
                text_align: "left",
              },
            }
          ]
          setDynamicFields(defaultFields)
        }
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

  const addDynamicField = (type: DynamicField['type']) => {
    const newField: DynamicField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: getFieldLabel(type),
      position: { x: 100, y: 100 },
      style: {
        font_family: "Arial",
        font_size: 16,
        font_weight: "normal",
        color: "#000000",
        text_align: "center",
      },
      custom_text: type === "custom_text" ? "Enter custom text" : undefined,
    }
    setDynamicFields([...dynamicFields, newField])
    setSelectedFieldId(newField.id)
  }

  const updateDynamicField = (fieldId: string, updates: Partial<DynamicField>) => {
    setDynamicFields(fields =>
      fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    )
  }

  const deleteDynamicField = (fieldId: string) => {
    setDynamicFields(fields => fields.filter(field => field.id !== fieldId))
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null)
    }
  }

  const getFieldLabel = (type: DynamicField['type']): string => {
    switch (type) {
      case "student_name": return "Student Name"
      case "event_name": return "Event Name"
      case "event_date": return "Event Date"
      case "certificate_number": return "Certificate Number"
      case "institution_name": return "Institution Name"
      case "custom_text": return "Custom Text"
      default: return "Field"
    }
  }

  const getFieldPreviewValue = (field: DynamicField): string => {
    switch (field.type) {
      case "student_name": return "KHYLE IVAN KHIM V. AMAGNA"
      case "event_name": return "2ND GENERAL ASSEMBLY"
      case "event_date": return "January 16, 2016"
      case "certificate_number": return "CERT-2024-001"
      case "institution_name": return "Bukidnon State University"
      case "custom_text": return field.custom_text || "Custom Text"
      default: return field.label
    }
  }

  const handleCertificateClick = (event: React.MouseEvent) => {
    if (draggedField) {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = (event.clientX - rect.left) / 0.4 // Account for 0.4 scale factor
      const y = (event.clientY - rect.top) / 0.4  // Account for 0.4 scale factor
      
      updateDynamicField(draggedField, {
        position: { x, y }
      })
      setDraggedField(null)
    }
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
        dynamic_fields: dynamicFields,
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

  const selectedField = dynamicFields.find(f => f.id === selectedFieldId)

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="background" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Background
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Dynamic Fields
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Background Design */}
          <TabsContent value="background">
            <Card>
              <CardHeader>
                <CardTitle>Certificate Design</CardTitle>
                <CardDescription>
                  Choose how to design your certificate background
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Design Type Selector */}
                <div className="space-y-4">
                  <Label>Design Type</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            Upload a complete certificate design and add dynamic fields
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        backgroundDesign.design_type === "custom" 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setBackgroundDesign(prev => ({ ...prev, design_type: "custom" }))}
                    >
                      <div className="flex items-center space-x-3">
                        <Palette className="h-8 w-8 text-green-600" />
                        <div>
                          <h3 className="font-semibold">Custom Design</h3>
                          <p className="text-sm text-gray-600">
                            Design from scratch with colors, borders, and logos
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Upload Section */}
                {backgroundDesign.design_type === "image" && (
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
                              ✓ Ready to add dynamic fields
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
                                  💡 Pro Tip: Upload a complete certificate design
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  We'll automatically add fields for student name and certificate number
                                </p>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Design Section */}
                {backgroundDesign.design_type === "custom" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bg_color">Background Color</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            id="bg_color"
                            value={backgroundDesign.background_color}
                            onChange={(e) => setBackgroundDesign(prev => ({ ...prev, background_color: e.target.value }))}
                            className="w-12 h-10 rounded border border-gray-300"
                          />
                          <Input
                            value={backgroundDesign.background_color}
                            onChange={(e) => setBackgroundDesign(prev => ({ ...prev, background_color: e.target.value }))}
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="border_color">Border Color</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            id="border_color"
                            value={backgroundDesign.border_color}
                            onChange={(e) => setBackgroundDesign(prev => ({ ...prev, border_color: e.target.value }))}
                            className="w-12 h-10 rounded border border-gray-300"
                          />
                          <Input
                            value={backgroundDesign.border_color}
                            onChange={(e) => setBackgroundDesign(prev => ({ ...prev, border_color: e.target.value }))}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="border_width">Border Width (px)</Label>
                        <Input
                          type="number"
                          id="border_width"
                          value={backgroundDesign.border_width}
                          onChange={(e) => setBackgroundDesign(prev => ({ ...prev, border_width: parseInt(e.target.value) || 2 }))}
                          min="0"
                          max="10"
                        />
                      </div>
                    </div>
                    
                    {/* Logo Upload Section */}
                    <div className="space-y-4">
                      <Label htmlFor="logo_upload">Certificate Logo</Label>
                      
                      {backgroundDesign.logo_url ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                            <img
                              src={backgroundDesign.logo_url}
                              alt="Logo preview"
                              className="w-16 h-16 object-contain border rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">Logo uploaded successfully</p>
                              <p className="text-xs text-gray-500">
                                {backgroundDesign.logo_url.split('/').pop()}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleLogoRemove}
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
                                if (file) handleLogoUpload(file)
                              }}
                              className="hidden"
                              id="logo_replace"
                            />
                            <Label htmlFor="logo_replace" className="cursor-pointer">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingLogo}
                                asChild
                              >
                                <span>
                                  {uploadingLogo ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                  )}
                                  Replace Logo
                                </span>
                              </Button>
                            </Label>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault()
                              const file = e.dataTransfer.files[0]
                              if (file && file.type.startsWith('image/')) {
                                handleLogoUpload(file)
                              }
                            }}
                          >
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleLogoUpload(file)
                              }}
                              className="hidden"
                              id="logo_upload"
                            />
                            <Label htmlFor="logo_upload" className="cursor-pointer">
                              <div className="flex flex-col items-center space-y-2">
                                {uploadingLogo ? (
                                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                                ) : (
                                  <Image className="h-8 w-8 text-gray-400" />
                                )}
                                <p className="text-sm text-gray-600">
                                  {uploadingLogo ? 'Uploading...' : 'Click to upload or drag and drop'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  PNG, JPG, GIF up to 5MB
                                </p>
                              </div>
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="logo_position">Logo Position</Label>
                        <Select
                          value={backgroundDesign.logo_position}
                          onValueChange={(value: any) => setBackgroundDesign(prev => ({ ...prev, logo_position: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top-left">Top Left</SelectItem>
                            <SelectItem value="top-center">Top Center</SelectItem>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pattern">Pattern</Label>
                        <Select
                          value={backgroundDesign.pattern}
                          onValueChange={(value: any) => setBackgroundDesign(prev => ({ ...prev, pattern: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="watermark">Watermark</SelectItem>
                            <SelectItem value="border-pattern">Border Pattern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dynamic Fields */}
          <TabsContent value="fields">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Field List */}
              <Card>
                <CardHeader>
                  <CardTitle>Dynamic Fields</CardTitle>
                  <CardDescription>
                    {backgroundDesign.design_type === "image" 
                      ? "Position fields over your uploaded certificate image"
                      : "Add and manage fields that will be populated with actual data"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {backgroundDesign.design_type === "image" ? (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">💡 Quick Setup</h4>
                      <p className="text-sm text-blue-700">
                        For image-based certificates, you typically only need:
                      </p>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1">
                        <li>• Student Name (already added)</li>
                        <li>• Certificate Number (already added)</li>
                        <li>• Optional: Event Date or Custom Text</li>
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {[
                      { type: "student_name", label: "Student Name" },
                      { type: "certificate_number", label: "Certificate #" },
                      { type: "event_name", label: "Event Name" },
                      { type: "event_date", label: "Event Date" },
                      { type: "institution_name", label: "Institution" },
                      { type: "custom_text", label: "Custom Text" },
                    ].map((fieldType) => (
                      <Button
                        key={fieldType.type}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDynamicField(fieldType.type as DynamicField['type'])}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-3 w-3" />
                        {fieldType.label}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    {dynamicFields.map((field) => (
                      <div
                        key={field.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFieldId === field.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedFieldId(field.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full cursor-grab ${
                              draggedField === field.id ? 'bg-blue-500' : 'bg-gray-400'
                            }`}
                            onMouseDown={() => setDraggedField(field.id)}
                          />
                          <div>
                            <div className="font-medium">{field.label}</div>
                            <div className="text-sm text-gray-500">
                              {field.type} • {field.position.x}, {field.position.y}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{field.style.font_size}px</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteDynamicField(field.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Field Properties */}
              <Card>
                <CardHeader>
                  <CardTitle>Field Properties</CardTitle>
                  <CardDescription>
                    {selectedField ? `Edit properties for ${selectedField.label}` : "Select a field to edit its properties"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedField ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="field_label">Label</Label>
                        <Input
                          id="field_label"
                          value={selectedField.label}
                          onChange={(e) => updateDynamicField(selectedField.id, { label: e.target.value })}
                        />
                      </div>
                      
                      {selectedField.type === "custom_text" && (
                        <div className="space-y-2">
                          <Label htmlFor="custom_text">Custom Text</Label>
                          <Input
                            id="custom_text"
                            value={selectedField.custom_text || ""}
                            onChange={(e) => updateDynamicField(selectedField.id, { custom_text: e.target.value })}
                            placeholder="Enter the text to display"
                          />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="field_x">X Position</Label>
                          <Input
                            type="number"
                            id="field_x"
                            value={selectedField.position.x}
                            onChange={(e) => updateDynamicField(selectedField.id, {
                              position: { ...selectedField.position, x: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="field_y">Y Position</Label>
                          <Input
                            type="number"
                            id="field_y"
                            value={selectedField.position.y}
                            onChange={(e) => updateDynamicField(selectedField.id, {
                              position: { ...selectedField.position, y: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="field_font_family">Font Family</Label>
                        <Select
                          value={selectedField.style.font_family}
                          onValueChange={(value) => updateDynamicField(selectedField.id, {
                            style: { ...selectedField.style, font_family: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                            <SelectItem value="Verdana">Verdana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="field_font_size">Font Size</Label>
                          <Input
                            type="number"
                            id="field_font_size"
                            value={selectedField.style.font_size}
                            onChange={(e) => updateDynamicField(selectedField.id, {
                              style: { ...selectedField.style, font_size: parseInt(e.target.value) || 16 }
                            })}
                            min="8"
                            max="72"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="field_font_weight">Font Weight</Label>
                          <Select
                            value={selectedField.style.font_weight}
                            onValueChange={(value: any) => updateDynamicField(selectedField.id, {
                              style: { ...selectedField.style, font_weight: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="field_color">Text Color</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              id="field_color"
                              value={selectedField.style.color}
                              onChange={(e) => updateDynamicField(selectedField.id, {
                                style: { ...selectedField.style, color: e.target.value }
                              })}
                              className="w-12 h-10 rounded border border-gray-300"
                            />
                            <Input
                              value={selectedField.style.color}
                              onChange={(e) => updateDynamicField(selectedField.id, {
                                style: { ...selectedField.style, color: e.target.value }
                              })}
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="field_text_align">Text Alignment</Label>
                          <Select
                            value={selectedField.style.text_align}
                            onValueChange={(value: any) => updateDynamicField(selectedField.id, {
                              style: { ...selectedField.style, text_align: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Select a field from the left to edit its properties
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Template Preview</CardTitle>
                <CardDescription>
                  {draggedField && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <MousePointer className="h-4 w-4" />
                      Click on the certificate to position the selected field
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-4xl mx-auto overflow-x-auto">
                  <div
                    className="relative mx-auto border-2 shadow-lg cursor-crosshair"
                    style={{
                      width: "2000px",
                      height: "1414px",
                      backgroundColor: backgroundDesign.design_type === "image" ? "transparent" : backgroundDesign.background_color,
                      borderColor: backgroundDesign.design_type === "image" ? "transparent" : backgroundDesign.border_color,
                      borderWidth: backgroundDesign.design_type === "image" ? "0px" : `${backgroundDesign.border_width}px`,
                      backgroundImage: backgroundDesign.certificate_background ? `url(${backgroundDesign.certificate_background})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      transform: "scale(0.4)",
                      transformOrigin: "top left",
                      marginBottom: "-565px", // Adjust margin to account for scaling
                      marginRight: "-800px"   // Adjust margin to account for scaling
                    }}
                    onClick={handleCertificateClick}
                  >
                    {/* Logo (only for custom design) */}
                    {backgroundDesign.design_type === "custom" && backgroundDesign.logo_url && (
                      <div
                        className={`absolute ${
                          backgroundDesign.logo_position === "top-left" ? "top-4 left-4" :
                          backgroundDesign.logo_position === "top-right" ? "top-4 right-4" :
                          backgroundDesign.logo_position === "center" ? "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" :
                          "top-4 left-1/2 transform -translate-x-1/2"
                        }`}
                      >
                        <img
                          src={backgroundDesign.logo_url}
                          alt="Logo"
                          className="max-w-[150px] max-h-[100px] object-contain"
                        />
                      </div>
                    )}
                    
                    {/* Dynamic Fields */}
                    {dynamicFields.map((field) => (
                      <div
                        key={field.id}
                        className={`absolute cursor-pointer transition-all duration-200 ${
                          selectedFieldId === field.id ? 'ring-2 ring-blue-500' : ''
                        } ${
                          draggedField === field.id ? 'opacity-50' : ''
                        }`}
                        style={{
                          left: `${field.position.x}px`,
                          top: `${field.position.y}px`,
                          fontFamily: field.style.font_family,
                          fontSize: `${field.style.font_size}px`,
                          fontWeight: field.style.font_weight,
                          color: field.style.color,
                          textAlign: field.style.text_align,
                          textShadow: backgroundDesign.design_type === "image" ? "1px 1px 2px rgba(255,255,255,0.8)" : "none"
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFieldId(field.id)
                        }}
                      >
                        {getFieldPreviewValue(field)}
                      </div>
                    ))}
                    
                    {/* Click instructions */}
                    {draggedField && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400 text-center pointer-events-none">
                        <MousePointer className="h-12 w-12 mx-auto mb-2" />
                        <p>Click to position field</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
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
      </form>
    </div>
  )
} 