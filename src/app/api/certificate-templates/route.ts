import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createCertificateTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
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
  }).default({}),
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
      x_offset: z.number().optional(), // Add optional x offset
      y_offset: z.number().optional(), // Add optional y offset
    }),
    custom_text: z.string().optional(), // For custom_text type
  })).default([]),
  template_html: z.string().optional(),
  template_css: z.string().optional(),
  is_active: z.boolean().default(true),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access certificate templates
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const activeOnly = searchParams.get('active_only') === 'true'
    
    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('certificate_templates')
      .select(`
        *,
        creator:users(
          id,
          name,
          email
        )
      `, { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }
    
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    // Apply pagination and ordering
    const { data: templates, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching certificate templates:', error)
      return NextResponse.json({ error: 'Failed to fetch certificate templates' }, { status: 500 })
    }

    return NextResponse.json({
      templates: templates || [],
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/certificate-templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create certificate templates
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const data = createCertificateTemplateSchema.parse(body)

    // Auto-add predefined fields for image-based templates if no dynamic_fields provided
    let dynamicFields = data.dynamic_fields
    if (data.background_design?.design_type === 'image' && 
        (!dynamicFields || dynamicFields.length === 0) &&
        data.background_design?.certificate_background) {
      // Add predefined fields with fixed positions
      dynamicFields = [
        {
          id: 'student_name',
          type: 'student_name',
          label: 'Student Name',
          position: {
            x: 1000,
            y: 650
          },
          style: {
            font_family: 'Poppins',
            font_size: 80,
            font_weight: 'bold',
            color: '#000000',
            text_align: 'center'
          }
        },
        {
          id: 'certificate_number',
          type: 'certificate_number',
          label: 'Certificate Number',
          position: {
            x: 550,
            y: 200
          },
          style: {
            font_family: 'Poppins',
            font_size: 30,
            font_weight: 'normal',
            color: '#000000',
            text_align: 'center'
          }
        }
      ]
    }

    // Generate default template HTML if not provided
    let templateHtml = data.template_html
    if (!templateHtml) {
      templateHtml = generateDefaultTemplateHtml({ ...data, dynamic_fields: dynamicFields })
    }

    // Generate default template CSS if not provided
    let templateCss = data.template_css
    if (!templateCss) {
      templateCss = generateDefaultTemplateCss(data)
    }

    // Create certificate template
    const { data: template, error } = await supabaseAdmin
      .from('certificate_templates')
      .insert([{
        title: data.title,
        description: data.description,
        background_design: data.background_design,
        dynamic_fields: dynamicFields,
        template_html: templateHtml,
        template_css: templateCss,
        is_active: data.is_active,
        created_by: session.user.id,
      }])
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
      console.error('Error creating certificate template:', error)
      return NextResponse.json({ error: 'Failed to create certificate template' }, { status: 500 })
    }

    return NextResponse.json({
      ...template,
      message: 'Certificate template created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/certificate-templates:', error)
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