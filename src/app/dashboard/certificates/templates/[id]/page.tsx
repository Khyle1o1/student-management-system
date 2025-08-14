import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Palette, Type, Settings, CheckCircle, XCircle, Download } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface CertificateTemplatePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CertificateTemplatePage({ params }: CertificateTemplatePageProps) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Await params to fix Next.js 15 compatibility
  const { id } = await params

  // Fetch template data
  const { data: template, error } = await supabase
    .from('certificate_templates')
    .select(`
      *,
      creator:users(
        id,
        name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (error || !template) {
    redirect("/dashboard/certificates/templates")
  }

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case "student_name": return "Student Name"
      case "event_name": return "Event Name"
      case "event_date": return "Event Date"
      case "certificate_number": return "Certificate Number"
      case "institution_name": return "Institution Name"
      case "custom_text": return "Custom Text"
      default: return type
    }
  }

  const getFieldPreviewValue = (field: any) => {
    switch (field.type) {
      case "student_name": return "John Doe"
      case "event_name": return "Annual Conference"
      case "event_date": return "December 15, 2024"
      case "certificate_number": return "CERT-2024-001"
      case "institution_name": return "Your Institution"
      case "custom_text": return field.custom_text || "Custom Text"
      default: return field.label
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/certificates/templates">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Templates
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{template.title}</h1>
              <p className="text-muted-foreground">
                Certificate template details and preview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <a href={`/api/certificate-templates/${template.id}/sample`} download>
                <Download className="mr-2 h-4 w-4" />
                Download Sample
              </a>
            </Button>
            <Link href={`/dashboard/certificates/templates/${template.id}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Template
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Template Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Title</div>
                <div className="text-lg font-semibold">{template.title}</div>
              </div>
              
              {template.description && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Description</div>
                  <div className="text-sm">{template.description}</div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Status</div>
                <div>
                  {template.is_active ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Created By</div>
                <div className="text-sm">{template.creator.name || template.creator.email}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Created</div>
                <div className="text-sm">{format(new Date(template.created_at), 'PPP')}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Last Updated</div>
                <div className="text-sm">{format(new Date(template.updated_at), 'PPP')}</div>
              </div>
            </CardContent>
          </Card>

          {/* Background Design */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Background Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Background Color</div>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: template.background_design.background_color }}
                    />
                    <span className="text-sm">{template.background_design.background_color}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Border Color</div>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: template.background_design.border_color }}
                    />
                    <span className="text-sm">{template.background_design.border_color}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Border Width</div>
                <div className="text-sm">{template.background_design.border_width}px</div>
              </div>

              {template.background_design.logo_url && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Logo</div>
                  <div className="flex items-center space-x-2">
                    <img 
                      src={template.background_design.logo_url} 
                      alt="Logo" 
                      className="w-10 h-10 object-contain border rounded"
                    />
                    <div>
                      <div className="text-sm">Position: {template.background_design.logo_position}</div>
                      <div className="text-xs text-gray-500">
                        {template.background_design.logo_url}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500">Pattern</div>
                <div className="text-sm capitalize">{template.background_design.pattern}</div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Dynamic Fields ({template.dynamic_fields.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {template.dynamic_fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No dynamic fields configured
                </div>
              ) : (
                <div className="space-y-3">
                  {template.dynamic_fields.map((field: any, index: number) => (
                    <div key={field.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{field.label}</div>
                          <div className="text-sm text-gray-500">
                            {getFieldTypeLabel(field.type)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {field.style.font_size}px
                          </div>
                          <div className="text-xs text-gray-500">
                            {field.position.x}, {field.position.y}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {field.style.font_family}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {field.style.font_weight}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {field.style.text_align}
                        </Badge>
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: field.style.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Template Preview</CardTitle>
              <CardDescription>
                How the certificate will look with sample data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto">
                <div
                  className="relative mx-auto border-2 shadow-lg"
                  style={{
                    width: "2000px",
                    height: "1414px",
                    backgroundColor: template.background_design.design_type === "image" ? "transparent" : template.background_design.background_color,
                    borderColor: template.background_design.design_type === "image" ? "transparent" : template.background_design.border_color,
                    borderWidth: template.background_design.design_type === "image" ? "0px" : `${template.background_design.border_width}px`,
                    backgroundImage: template.background_design.certificate_background ? `url(${template.background_design.certificate_background})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    transform: "scale(0.4)",
                    transformOrigin: "top left",
                    marginBottom: "-565px",
                    marginRight: "-800px"
                  }}
                >
                  {/* Logo (only for custom design) */}
                  {template.background_design.design_type !== "image" && template.background_design.logo_url && (
                    <div
                      className={`absolute ${
                        template.background_design.logo_position === "top-left" ? "top-2 left-2" :
                        template.background_design.logo_position === "top-right" ? "top-2 right-2" :
                        template.background_design.logo_position === "center" ? "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" :
                        "top-2 left-1/2 transform -translate-x-1/2"
                      }`}
                    >
                      <img
                        src={template.background_design.logo_url}
                        alt="Logo"
                        className="max-w-[150px] max-h-[100px] object-contain"
                      />
                    </div>
                  )}
                  
                  {/* Dynamic Fields */}
                  {template.dynamic_fields.map((field: any) => (
                    <div
                      key={field.id}
                      className="absolute"
                      style={{
                        left: `${field.position.x}px`,
                        top: `${field.position.y}px`,
                        fontFamily: field.style.font_family,
                        fontSize: `${field.style.font_size}px`,
                        fontWeight: field.style.font_weight,
                        color: field.style.color,
                        textAlign: field.style.text_align,
                        textShadow: template.background_design.design_type === "image" ? "1px 1px 2px rgba(255,255,255,0.8)" : "none"
                      }}
                    >
                      {getFieldPreviewValue(field)}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
} 