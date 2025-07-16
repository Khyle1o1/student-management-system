import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateCertificateTemplateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  background_design: z.object({
    background_color: z.string().default("#ffffff"),
    border_color: z.string().default("#000000"),
    border_width: z.number().default(2),
    logo_url: z.string().optional(),
    logo_position: z.enum(["top-left", "top-center", "top-right", "center"]).default("top-center"),
    pattern: z.enum(["none", "watermark", "border-pattern"]).default("none"),
    certificate_background: z.string().optional(), // Add background image field
    design_type: z.enum(["custom", "image"]).default("custom"), // Add design type field
  }).optional(),
  dynamic_fields: z.array(z.object({
    id: z.string(),
    type: z.enum(["student_name", "event_name", "event_date", "certificate_number", "institution_name", "custom_text"]),
    label: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    style: z.object({
      font_family: z.string().default("Arial"),
      font_size: z.number().default(16),
      font_weight: z.enum(["normal", "bold"]).default("normal"),
      color: z.string().default("#000000"),
      text_align: z.enum(["left", "center", "right"]).default("center"),
    }),
    custom_text: z.string().optional(),
  })).optional(),
  template_html: z.string().optional(),
  template_css: z.string().optional(),
  is_active: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access certificate templates
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = params

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

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Certificate template not found' }, { status: 404 })
      }
      console.error('Error fetching certificate template:', error)
      return NextResponse.json({ error: 'Failed to fetch certificate template' }, { status: 500 })
    }

    return NextResponse.json(template)

  } catch (error) {
    console.error('Error in GET /api/certificate-templates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update certificate templates
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const data = updateCertificateTemplateSchema.parse(body)

    // Check if template exists
    const { data: existingTemplate, error: existingError } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (existingError) {
      if (existingError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Certificate template not found' }, { status: 404 })
      }
      console.error('Error fetching existing template:', existingError)
      return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.background_design !== undefined) updateData.background_design = data.background_design
    if (data.dynamic_fields !== undefined) updateData.dynamic_fields = data.dynamic_fields
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    // Regenerate HTML/CSS if design or fields changed
    if (data.template_html !== undefined) {
      updateData.template_html = data.template_html
    } else if (data.background_design !== undefined || data.dynamic_fields !== undefined) {
      updateData.template_html = generateDefaultTemplateHtml({
        background_design: data.background_design || existingTemplate.background_design,
        dynamic_fields: data.dynamic_fields || existingTemplate.dynamic_fields
      })
    }

    if (data.template_css !== undefined) {
      updateData.template_css = data.template_css
    } else if (data.background_design !== undefined) {
      updateData.template_css = generateDefaultTemplateCss({
        background_design: data.background_design || existingTemplate.background_design
      })
    }

    // Update the template
    const { data: updatedTemplate, error } = await supabase
      .from('certificate_templates')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:users(
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error updating certificate template:', error)
      return NextResponse.json({ error: 'Failed to update certificate template' }, { status: 500 })
    }

    return NextResponse.json({
      ...updatedTemplate,
      message: 'Certificate template updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/certificate-templates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete certificate templates
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = params

    // Check if template is used in any events
    const { data: eventTemplates, error: eventError } = await supabase
      .from('event_certificate_templates')
      .select('id')
      .eq('certificate_template_id', id)
      .limit(1)

    if (eventError) {
      console.error('Error checking template usage:', eventError)
      return NextResponse.json({ error: 'Failed to check template usage' }, { status: 500 })
    }

    if (eventTemplates && eventTemplates.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete template that is used in events. Please remove it from events first or deactivate it instead.' 
      }, { status: 400 })
    }

    // Check if template is used in any certificates
    const { data: certificates, error: certError } = await supabase
      .from('certificates')
      .select('id')
      .eq('certificate_template_id', id)
      .limit(1)

    if (certError) {
      console.error('Error checking certificate usage:', certError)
      return NextResponse.json({ error: 'Failed to check certificate usage' }, { status: 500 })
    }

    if (certificates && certificates.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete template that has been used to generate certificates. Please deactivate it instead.' 
      }, { status: 400 })
    }

    // Delete the template
    const { error } = await supabase
      .from('certificate_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting certificate template:', error)
      return NextResponse.json({ error: 'Failed to delete certificate template' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Certificate template deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/certificate-templates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate default template HTML
function generateDefaultTemplateHtml(data: any): string {
  const { background_design, dynamic_fields } = data
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Certificate Template</title>
        <style>
          {TEMPLATE_CSS}
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="certificate-content">
            ${background_design.logo_url ? `
              <div class="logo-container">
                <img src="${background_design.logo_url}" alt="Logo" class="logo" />
              </div>
            ` : ''}
            
            <div class="certificate-body">
              ${dynamic_fields.map((field: any) => `
                <div class="field field-${field.id}" style="
                  position: absolute;
                  left: ${field.position.x}px;
                  top: ${field.position.y}px;
                  font-family: ${field.style.font_family};
                  font-size: ${field.style.font_size}px;
                  font-weight: ${field.style.font_weight};
                  color: ${field.style.color};
                  text-align: ${field.style.text_align};
                ">
                  {{${field.type}}}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

// Helper function to generate default template CSS
function generateDefaultTemplateCss(data: any): string {
  const { background_design } = data
  
  return `
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #f0f0f0;
    }
    
    .certificate-container {
      width: 2000px;
      height: 1414px;
      margin: 0 auto;
      position: relative;
      background: ${background_design.background_color || '#ffffff'};
      border: ${background_design.border_width || 2}px solid ${background_design.border_color || '#000000'};
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .certificate-content {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 40px;
      box-sizing: border-box;
    }
    
    .logo-container {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .logo {
      max-width: 150px;
      max-height: 100px;
      object-fit: contain;
    }
    
    .certificate-body {
      position: relative;
      width: 100%;
      height: 100%;
    }
    
    .field {
      position: absolute;
      white-space: nowrap;
    }
    
    /* Responsive adjustments */
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .certificate-container {
        box-shadow: none;
        margin: 0;
      }
    }
  `
} 