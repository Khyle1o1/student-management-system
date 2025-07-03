"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  FileText
} from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"

interface StudentRecord {
  name: string
  studentId: string
  email: string
  yearLevel: string
  course: string
  college: string
  password?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
  value: string
}

interface ImportProgress {
  current: number
  total: number
  percentage: number
  status: string
}

interface ImportResult {
  totalRows: number
  successCount: number
  errorCount: number
  duplicateCount: number
  errors: ValidationError[]
  duplicates: string[]
}

const SAMPLE_TEMPLATE = [
  {
    name: "John Doe",
    studentId: "2024001",
    email: "john.doe@student.edu",
    yearLevel: "YEAR_1",
    course: "Computer Science",
    college: "College of Technology",
    password: "student123"
  },
  {
    name: "Jane Smith", 
    studentId: "2024002",
    email: "jane.smith@student.edu",
    yearLevel: "YEAR_2",
    course: "Information Technology",
    college: "College of Engineering",
    password: "student123"
  }
]

const REQUIRED_FIELDS = ["name", "studentId", "email", "yearLevel", "course", "college"]
const YEAR_LEVELS = ["YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4"]

export function BatchStudentImport() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [preview, setPreview] = useState<StudentRecord[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
    if (format === 'csv') {
      const csv = Papa.unparse(SAMPLE_TEMPLATE)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'student_import_template.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const ws = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Students')
      XLSX.writeFile(wb, 'student_import_template.xlsx')
    }
  }

  const validateStudentRecord = (record: any, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = []

    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!record[field] || String(record[field]).trim() === '') {
        errors.push({
          row: rowIndex,
          field,
          message: `${field} is required`,
          value: record[field] || ''
        })
      }
    })

    // Validate email format
    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
      errors.push({
        row: rowIndex,
        field: 'email',
        message: 'Invalid email format',
        value: record.email
      })
    }

    // Validate year level
    if (record.yearLevel && !YEAR_LEVELS.includes(record.yearLevel)) {
      errors.push({
        row: rowIndex,
        field: 'yearLevel',
        message: `Year level must be one of: ${YEAR_LEVELS.join(', ')}`,
        value: record.yearLevel
      })
    }

    // Validate student ID format (numbers only)
    if (record.studentId && !/^\d+$/.test(record.studentId)) {
      errors.push({
        row: rowIndex,
        field: 'studentId',
        message: 'Student ID must contain only numbers',
        value: record.studentId
      })
    }

    return errors
  }

  const parseFile = async (file: File): Promise<StudentRecord[]> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()

      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data as StudentRecord[])
          },
          error: (error) => {
            reject(error)
          }
        })
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(worksheet)
            resolve(jsonData as StudentRecord[])
          } catch (error) {
            reject(error)
          }
        }
        reader.readAsArrayBuffer(file)
      } else {
        reject(new Error('Unsupported file format. Please use CSV or Excel files.'))
      }
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportResult(null)
    setShowResults(false)

    try {
      const records = await parseFile(selectedFile)
      setPreview(records.slice(0, 10)) // Show first 10 records for preview
      setShowPreview(true)
    } catch (error) {
      alert(`Error reading file: ${error}`)
    }
  }

  const processImport = async () => {
    if (!file) return

    setIsUploading(true)
    setImportResult(null)
    setConnectionError(null)
    setImportProgress({ current: 0, total: 0, percentage: 0, status: "Preparing import..." })

    try {
      const records = await parseFile(file)
      const allErrors: ValidationError[] = []
      const validRecords: StudentRecord[] = []
      const duplicates: string[] = []

      setImportProgress({ 
        current: 0, 
        total: records.length, 
        percentage: 0, 
        status: "Validating records..." 
      })

      // Validate all records
      records.forEach((record, index) => {
        const errors = validateStudentRecord(record, index + 1)
        allErrors.push(...errors)

        if (errors.length === 0) {
          validRecords.push({
            name: String(record.name).trim(),
            studentId: String(record.studentId).trim(),
            email: String(record.email).trim().toLowerCase(),
            yearLevel: String(record.yearLevel).trim(),
            course: String(record.course).trim(),
            college: String(record.college).trim(),
            password: record.password ? String(record.password).trim() : 'student123'
          })
        }
        
        // Update validation progress
        setImportProgress(prev => ({ 
          current: index + 1, 
          total: records.length, 
          percentage: Math.round(((index + 1) / records.length) * 100), 
          status: "Validating records..." 
        }))
      })

      // Send valid records to API for processing
      if (validRecords.length > 0) {
        setImportProgress({ 
          current: 0, 
          total: validRecords.length, 
          percentage: 0, 
          status: "Sending data to server..." 
        })

        // Start polling for progress updates
        const progressInterval = setInterval(() => {
          // Simulate progress updates before we get real feedback
          setImportProgress(prev => {
            if (!prev) return null
            
            // Don't exceed 90% until we get actual completion
            const newPercentage = Math.min(90, prev.percentage + 1)
            return {
              ...prev,
              percentage: newPercentage,
              status: `Processing records (${newPercentage}%)...`
            }
          })
        }, 300)

        try {
          const response = await fetch('/api/students/batch-import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ students: validRecords }),
          })

          // Clear the interval once we get a response
          clearInterval(progressInterval)
          
          const result = await response.json()

          if (response.ok) {
            setImportProgress({ 
              current: validRecords.length, 
              total: validRecords.length, 
              percentage: 100, 
              status: "Import complete!" 
            })
            
            setImportResult({
              totalRows: records.length,
              successCount: result.successCount,
              errorCount: allErrors.length,
              duplicateCount: result.duplicates?.length || 0,
              errors: allErrors,
              duplicates: result.duplicates || []
            })
          } else {
            // Check if it's a database connection error
            const errorMessage = result.error || result.details || 'Import failed';
            const isDbConnectionError = 
              errorMessage.includes("Can't reach database") || 
              errorMessage.includes("Database connection failed") ||
              errorMessage.includes("P1001") || 
              errorMessage.includes("P1002") ||
              errorMessage.includes("P1017") ||
              result.status === "database_error";
              
            const errorDetails = isDbConnectionError 
              ? "The system cannot connect to the database server. This is likely a temporary issue."
              : errorMessage;
              
            setImportProgress({ 
              current: 0, 
              total: validRecords.length, 
              percentage: 0, 
              status: isDbConnectionError 
                ? "Database connection error. Please try again later." 
                : `Import failed: ${errorMessage}` 
            })
            
            if (isDbConnectionError) {
              setConnectionError(`Database connection error: ${errorDetails}`);
            } else {
              setConnectionError(`Import failed: ${errorMessage}`);
            }
            
            throw new Error(errorMessage)
          }
        } catch (error) {
          clearInterval(progressInterval)
          
          // Check if it's a network error
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isNetworkError = 
            errorMessage.includes("NetworkError") || 
            errorMessage.includes("Failed to fetch");
          const isDbError = 
            errorMessage.includes("Database connection failed") ||
            errorMessage.includes("Can't reach database") ||
            errorMessage.includes("P1001") || 
            errorMessage.includes("P1002") ||
            errorMessage.includes("P1017");
            
          setImportProgress({ 
            current: 0, 
            total: validRecords.length, 
            percentage: 0, 
            status: isNetworkError
              ? "Network connection error. Please check your internet connection."
              : isDbError
                ? "Database connection error. Please try again later."
                : `Import error: ${errorMessage}`
          })
          
          if (isNetworkError) {
            setConnectionError("Network connection error: Failed to reach the server. Please check your internet connection.");
          } else if (isDbError) {
            setConnectionError(`Database connection error: ${errorMessage}`);
          } else {
            setConnectionError(`Import error: ${errorMessage}`);
          }
          
          throw error
        }
      } else {
        setImportProgress({ 
          current: records.length, 
          total: records.length, 
          percentage: 100, 
          status: "Validation complete, no valid records found" 
        })
        
        setImportResult({
          totalRows: records.length,
          successCount: 0,
          errorCount: allErrors.length,
          duplicateCount: 0,
          errors: allErrors,
          duplicates: []
        })
      }

      setShowResults(true)
      setShowPreview(false)
    } catch (error) {
      setImportProgress({ 
        current: 0, 
        total: 0, 
        percentage: 0, 
        status: `Import failed: ${error}` 
      })
      alert(`Import failed: ${error}`)
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setPreview([])
    setImportResult(null)
    setConnectionError(null)
    setShowPreview(false)
    setShowResults(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Batch Student Import</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Error Alert */}
          {connectionError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium">{connectionError}</p>
                <p className="text-sm mt-1">
                  The server might be experiencing high load or network issues. 
                  Please try again in a few minutes or contact the system administrator if the problem persists.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-2 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setConnectionError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Template Download Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Download Template</h3>
              <p className="text-sm text-muted-foreground">
                Download a sample template to see the required format for student data
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => downloadTemplate('csv')}
                className="flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Download CSV Template</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadTemplate('xlsx')}
                className="flex items-center space-x-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Download Excel Template</span>
              </Button>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Upload Student Data</h3>
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file containing student information
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="max-w-md"
              />
              {file && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  <span>{file.name}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Required Fields Info */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Required Fields:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
              {REQUIRED_FIELDS.map(field => (
                <div key={field} className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>{field}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Optional fields: password (defaults to 'student123')
            </p>
            <div className="mt-2 text-xs text-blue-700">
              <strong>Year Level Format:</strong> YEAR_1, YEAR_2, YEAR_3, YEAR_4<br/>
              <strong>College Examples:</strong> College of Technology, College of Engineering, College of Education
            </div>
          </div>

          {/* Progress Indicator */}
          {isUploading && importProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div>{importProgress.status}</div>
                <div>{importProgress.percentage}%</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${importProgress.percentage}%` }}
                ></div>
              </div>
              {importProgress.total > 0 && (
                <div className="text-xs text-muted-foreground text-center">
                  Processing {importProgress.current} of {importProgress.total} records
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {showPreview && preview.length > 0 && !isUploading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview (First 10 records)</h3>
                <div className="flex space-x-2">
                  <Button onClick={resetForm} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={processImport} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import {preview.length > 10 ? `All Records` : `${preview.length} Records`}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Year Level</TableHead>
                      <TableHead>Course</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.studentId}</TableCell>
                        <TableCell>{record.email}</TableCell>
                        <TableCell>{record.yearLevel}</TableCell>
                        <TableCell>{record.course}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Results Section */}
          {showResults && importResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Import Results</h3>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResult.totalRows}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.successCount}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.errorCount}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.duplicateCount}</div>
                    <div className="text-sm text-muted-foreground">Duplicates</div>
                  </CardContent>
                </Card>
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-900">Validation Errors:</h4>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Error</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.field}</TableCell>
                            <TableCell className="text-red-600">{error.message}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{error.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Duplicate Details */}
              {importResult.duplicates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-900">Duplicate Entries (Skipped):</h4>
                  <div className="flex flex-wrap gap-2">
                    {importResult.duplicates.map((duplicate, index) => (
                      <Badge key={index} variant="outline" className="text-yellow-700">
                        {duplicate}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={resetForm} className="mt-4">
                Import Another File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 