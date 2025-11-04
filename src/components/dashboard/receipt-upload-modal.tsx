"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react"

interface ReceiptUploadModalProps {
  open: boolean
  onClose: () => void
  feeId: string
  feeName: string
  feeAmount: number
  onSuccess: () => void
}

export function ReceiptUploadModal({
  open,
  onClose,
  feeId,
  feeName,
  feeAmount,
  onSuccess
}: ReceiptUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [amount, setAmount] = useState(feeAmount.toString())
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only image files (JPEG, PNG, GIF) and PDF files are allowed')
      return
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('feeId', feeId)
      formData.append('amount', amount)

      const response = await fetch('/api/payments/upload-receipt', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload receipt')
      }

      // Success - close modal and refresh
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview(null)
    setAmount(feeAmount.toString())
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Payment Receipt</DialogTitle>
          <DialogDescription>
            Upload your payment receipt for <strong>{feeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={feeAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={uploading}
            />
            <p className="text-sm text-gray-500">
              Fee amount: ₱{feeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt File</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <Input
                id="receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="receipt"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                {preview ? (
                  <div className="relative w-full">
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setPreview(null)
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : file ? (
                  <div className="flex items-center space-x-2">
                    {file.type === 'application/pdf' ? (
                      <FileText className="h-8 w-8 text-blue-500" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-green-500" />
                    )}
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF, or PDF (max. 10MB)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || uploading || parseFloat(amount) <= 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Receipt
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

