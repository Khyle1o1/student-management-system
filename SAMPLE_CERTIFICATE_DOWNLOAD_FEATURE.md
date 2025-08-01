# Sample Certificate Download Feature

## Overview

The sample certificate download feature allows administrators to preview exactly what students will receive when certificates are generated from a template. This feature provides a way to test and verify certificate designs before they are used for actual students.

## Features

### 1. Sample Download API Endpoint
- **Endpoint**: `/api/certificate-templates/[id]/sample`
- **Method**: GET
- **Authentication**: Admin only
- **Response**: PDF file download

### 2. Sample Data Used
The sample certificate uses the following placeholder data:
- **Student Name**: "SAMPLE STUDENT NAME"
- **Event Name**: "SAMPLE EVENT TITLE"
- **Event Date**: Current date in "MMMM dd, yyyy" format
- **Certificate Number**: "SAMPLE-CERT-2024-001"
- **Institution Name**: "Bukidnon State University"
- **Custom Text**: Uses the custom text specified in the field or "SAMPLE CUSTOM TEXT"

### 3. Visual Indicators
- Sample certificates include a "SAMPLE CERTIFICATE" watermark at the bottom
- For image-based certificates, text includes a white shadow for better visibility

## Usage

### In Certificate Template Form
1. Navigate to `/dashboard/certificates/templates/new` or `/dashboard/certificates/templates/[id]/edit`
2. Design your certificate template with fields and styling
3. Save the template (required before downloading sample)
4. Click the "Download Sample" button in the action buttons section
5. The sample PDF will be generated and downloaded automatically

### In Certificate Template View
1. Navigate to `/dashboard/certificates/templates/[id]`
2. Click the "Download Sample" button in the header
3. The sample PDF will be generated and downloaded automatically

## Technical Implementation

### API Endpoint Details
```typescript
// File: src/app/api/certificate-templates/[id]/sample/route.ts
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> })
```

### Key Features
- **Template Loading**: Fetches the complete certificate template from the database
- **PDF Generation**: Uses jsPDF to generate the sample certificate
- **Image Support**: Handles both custom designs and image-based certificates
- **Field Positioning**: Converts template coordinates to PDF coordinates
- **Font Styling**: Applies all font properties (family, size, weight, color, alignment)
- **Background Support**: Supports both custom backgrounds and uploaded certificate images

### Error Handling
- Validates template existence
- Handles image loading errors gracefully
- Provides meaningful error messages
- Ensures proper PDF buffer generation

## Benefits

1. **Quality Assurance**: Verify certificate designs before deployment
2. **Design Validation**: Test field positioning and styling
3. **User Experience**: Preview exactly what students will receive
4. **Time Saving**: Avoid generating actual certificates for testing
5. **Design Iteration**: Quickly test different designs and layouts

## Security

- Only administrators can access the sample download feature
- Template ID validation prevents unauthorized access
- Proper authentication and authorization checks
- Safe file handling and download mechanisms

## File Structure

```
src/
├── app/
│   └── api/
│       └── certificate-templates/
│           └── [id]/
│               └── sample/
│                   └── route.ts          # Sample download API
└── components/
    └── dashboard/
        └── certificate-template-form.tsx # Updated with sample download button
```

## Future Enhancements

1. **Custom Sample Data**: Allow administrators to specify custom sample data
2. **Multiple Samples**: Generate samples for different scenarios
3. **Preview Mode**: In-browser preview without download
4. **Batch Sample Generation**: Generate samples for multiple templates
5. **Sample Templates**: Pre-built sample templates for common use cases 