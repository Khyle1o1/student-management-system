# Attendance Override Feature

## Overview
The attendance override feature allows administrators to enable attendance recording even when an event is inactive (before start time, after end time, or on a different date).

## How It Works

### When Event is Inactive
When you navigate to an event's attendance page and the event is inactive, you'll see:
- A yellow warning banner showing "Event Inactive" with the reason (e.g., "Event ended at 17:23:00")
- An **"Override"** button in the warning banner
- All attendance input fields will be disabled

### Activating Override
1. Click the **"Override"** button in the yellow warning banner
2. A password dialog will appear
3. Enter the admin password (default: `admin123`)
4. Click **"Activate Override"**

### When Override is Active
- The warning banner turns green showing "Event Active (Override)"
- Message displays: "Attendance recording enabled by admin override"
- All attendance input fields become enabled
- You can record attendance normally (sign in/sign out, bulk attendance, etc.)
- A **"Deactivate"** button appears to turn off the override

### Deactivating Override
- Click the **"Deactivate"** button in the green banner
- Override will be turned off and event timing rules will apply again

## Changing the Password

To change the override password:

1. Open the file: `src/app/dashboard/attendance/[id]/page.tsx`
2. Find the `handleOverrideSubmit` function (around line 629)
3. Change this line:
   ```typescript
   const OVERRIDE_PASSWORD = "admin123"
   ```
   to your desired password:
   ```typescript
   const OVERRIDE_PASSWORD = "your_new_password_here"
   ```
4. Save the file

## Important Notes

- **Override persists until page refresh**: Once activated, the override remains active until you either deactivate it manually or refresh the page
- **Security**: The password is checked client-side. For production use, consider implementing server-side authentication
- **Use Cases**:
  - Late attendance recording after event has ended
  - Early sign-in before event officially starts
  - Manual attendance corrections on different dates
  - Emergency attendance recording

## Technical Details

### State Management (Frontend)
- `isOverrideActive`: Boolean flag indicating if override is active
- `showOverrideDialog`: Controls password dialog visibility
- `overridePassword`: Stores the password input value

### Modified Functions (Frontend)
- `handleBarcodeSubmit`: Passes `adminOverride` flag to API
- `handleBulkSubmit`: Passes `adminOverride` flag to API
- Event status display: Shows override status in the UI

### Modified API Routes (Backend)
- **`/api/attendance/barcode-scan/route.ts`**:
  - Added `adminOverride` parameter to schema
  - Skips time validation when `adminOverride` is true
  
- **`/api/attendance/bulk-scan/route.ts`**:
  - Added `adminOverride` parameter to schema
  - Skips time validation when `adminOverride` is true

### How It Works
1. User activates override in UI with password
2. Frontend sets `isOverrideActive` state to `true`
3. When making attendance API calls, frontend passes `adminOverride: true`
4. Backend receives the flag and skips time window validation
5. Attendance records are created regardless of event timing

### Security Considerations
- Current implementation uses client-side password validation
- Backend respects the `adminOverride` flag from authenticated users
- For production environments, consider:
  - Server-side password verification for override activation
  - Session-based authentication with admin roles
  - Audit logging of override activations
  - Database tracking of override usage
  - Role-based access control (admin-only)
  - Time-limited override tokens

## Troubleshooting

**Override button not showing**
- Make sure the event is actually inactive
- Check that the event time status is loading correctly

**Password not working**
- Verify you're using the correct password
- Check the password is not case-sensitive
- Look at the console for any errors

**Override not enabling inputs**
- Refresh the page and try again
- Check browser console for JavaScript errors
- Ensure the `isOverrideActive` state is being set correctly

