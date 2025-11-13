"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, RefreshCw, Send, CheckCircle, XCircle } from "lucide-react"

interface NotificationSettings {
  id?: string
  enabled: boolean
  sender_email: string
  sender_name: string
  reply_to: string
  event_reminder_1_day: boolean
  event_reminder_1_hour: boolean
  fee_reminder_on_assignment: boolean
  fee_reminder_3_days: boolean
  certificate_notification: boolean
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    sender_email: 'noreply@smartu.edu',
    sender_name: 'SmartU',
    reply_to: 'support@smartu.edu',
    event_reminder_1_day: true,
    event_reminder_1_hour: true,
    fee_reminder_on_assignment: true,
    fee_reminder_3_days: true,
    certificate_notification: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async (type: 'event' | 'fee' | 'certificate') => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' })
      return
    }

    try {
      setSendingTest(true)
      setMessage(null)
      
      const response = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, email: testEmail }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: `Test ${type} email sent successfully!` })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' })
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      setMessage({ type: 'error', text: 'An error occurred while sending' })
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure automatic email reminders for events, fees, and certificates
        </p>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>
            Configure the sender information for notification emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
            <Label>Enable all email notifications</Label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sender_email">Sender Email</Label>
              <Input
                id="sender_email"
                type="email"
                value={settings.sender_email}
                onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                placeholder="noreply@smartu.edu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_name">Sender Name</Label>
              <Input
                id="sender_name"
                value={settings.sender_name}
                onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                placeholder="SmartU"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply_to">Reply-To Email</Label>
              <Input
                id="reply_to"
                type="email"
                value={settings.reply_to}
                onChange={(e) => setSettings({ ...settings, reply_to: e.target.value })}
                placeholder="support@smartu.edu"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Reminders</CardTitle>
          <CardDescription>
            Automatically remind students about upcoming events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>1 Day Before Event</Label>
              <p className="text-sm text-muted-foreground">
                Send reminder 1 day before the event starts
              </p>
            </div>
            <Switch
              checked={settings.event_reminder_1_day}
              onCheckedChange={(checked) => setSettings({ ...settings, event_reminder_1_day: checked })}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>1 Hour Before Event</Label>
              <p className="text-sm text-muted-foreground">
                Send reminder 1 hour before the event starts
              </p>
            </div>
            <Switch
              checked={settings.event_reminder_1_hour}
              onCheckedChange={(checked) => setSettings({ ...settings, event_reminder_1_hour: checked })}
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee Reminders</CardTitle>
          <CardDescription>
            Automatically remind students about fee payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>On Fee Assignment</Label>
              <p className="text-sm text-muted-foreground">
                Send notification when a new fee is assigned
              </p>
            </div>
            <Switch
              checked={settings.fee_reminder_on_assignment}
              onCheckedChange={(checked) => setSettings({ ...settings, fee_reminder_on_assignment: checked })}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>3 Days Before Due Date</Label>
              <p className="text-sm text-muted-foreground">
                Send reminder 3 days before fee is due if unpaid
              </p>
            </div>
            <Switch
              checked={settings.fee_reminder_3_days}
              onCheckedChange={(checked) => setSettings({ ...settings, fee_reminder_3_days: checked })}
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certificate Notifications</CardTitle>
          <CardDescription>
            Notify students when certificates are ready
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Certificate Ready</Label>
              <p className="text-sm text-muted-foreground">
                Send notification when certificate is ready for download
              </p>
            </div>
            <Switch
              checked={settings.certificate_notification}
              onCheckedChange={(checked) => setSettings({ ...settings, certificate_notification: checked })}
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Email</CardTitle>
          <CardDescription>
            Send a test email to verify your configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test_email">Test Email Address</Label>
            <Input
              id="test_email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleSendTest('event')}
              disabled={sendingTest || !testEmail}
            >
              <Send className="h-4 w-4 mr-2" />
              Test Event Email
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendTest('fee')}
              disabled={sendingTest || !testEmail}
            >
              <Send className="h-4 w-4 mr-2" />
              Test Fee Email
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendTest('certificate')}
              disabled={sendingTest || !testEmail}
            >
              <Send className="h-4 w-4 mr-2" />
              Test Certificate Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={fetchSettings} disabled={loading || saving}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}

