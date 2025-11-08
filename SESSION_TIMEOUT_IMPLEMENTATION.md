# Session Timeout Implementation

## Overview

This document describes the implementation of the automatic session timeout feature in the Student Management System. The feature automatically logs out users after 1 minute of inactivity and prevents access after closing and reopening the browser within that timeframe.

## Features

✅ **Automatic Session Timeout**: Users are logged out after 1 minute of inactivity
✅ **Activity Tracking**: Monitors mouse, keyboard, scroll, and touch events
✅ **Tab/Window Awareness**: Detects when users switch tabs or minimize the window
✅ **Session Storage**: Uses `sessionStorage` for timeout tracking (clears on browser close)
✅ **User Notification**: Shows a toast notification when session expires
✅ **Global Implementation**: Works across all pages and routes
✅ **Automatic Cleanup**: Clears session data on logout

## Implementation Details

### Files Created

1. **`src/lib/session-storage.ts`**
   - Utility functions for managing session timeout in `sessionStorage`
   - Tracks last activity timestamp
   - Checks if session has expired (> 1 minute)
   - Provides functions to clear session data

2. **`src/hooks/use-session-timeout.ts`**
   - Custom React hook that manages session timeout logic
   - Monitors user activity events (mouse, keyboard, scroll, touch)
   - Checks session expiry periodically (every 10 seconds)
   - Handles page visibility changes (tab switching)
   - Automatically signs out user when session expires

3. **`src/components/session-timeout-manager.tsx`**
   - Global component that applies session timeout to the entire app
   - Uses the `useSessionTimeout` hook
   - Renders nothing but sets up all event listeners

### Files Modified

1. **`src/components/providers.tsx`**
   - Added `SessionTimeoutManager` component
   - Now wraps the entire app with session timeout functionality

## How It Works

### 1. Initial Load
When the user first loads the app or logs in:
- Last activity timestamp is stored in `sessionStorage`
- Activity event listeners are attached
- Periodic expiry checks begin

### 2. Activity Tracking
User activity is tracked through these events:
- `mousedown` - Mouse clicks
- `mousemove` - Mouse movement
- `keypress` - Keyboard input
- `scroll` - Page scrolling
- `touchstart` - Touch interactions
- `click` - Click events

When any of these events occur:
- Last activity timestamp is updated in `sessionStorage`
- Updates are throttled to once per second for performance

### 3. Timeout Detection
The system checks for timeout in multiple ways:

**A. Periodic Checks** (every 10 seconds)
- Compares current time with last activity timestamp
- If > 1 minute, triggers logout

**B. Tab Visibility Changes**
- When user returns to the tab (makes it visible)
- Checks if session expired while away
- If expired, triggers logout
- If not expired, updates activity timestamp

**C. Initial Mount Check**
- When app loads, checks last activity timestamp
- If > 1 minute since last activity, triggers logout
- If no timestamp exists, sets initial timestamp

### 4. Session Expiry
When session expires:
1. Clears all session storage data
2. Shows toast notification: "Session expired due to inactivity"
3. Signs out user via NextAuth
4. Redirects to login page (`/auth/login`)

### 5. Browser Close Behavior
Since `sessionStorage` is used:
- Closing the browser/tab clears `sessionStorage` automatically
- Reopening within 1 minute has no stored timestamp
- User can log in normally
- This is different from `localStorage` which persists

## Testing Guide

### Test Case 1: Normal Activity (No Timeout)
1. Log in to the application
2. Move your mouse or interact with the page regularly
3. **Expected**: You remain logged in indefinitely

### Test Case 2: Inactivity Timeout
1. Log in to the application
2. Do not interact with the page for 1 minute and 10 seconds
3. **Expected**: 
   - Toast notification appears: "Session expired due to inactivity"
   - You are redirected to the login page
   - You must log in again

### Test Case 3: Tab Switching During Inactivity
1. Log in to the application
2. Switch to a different tab/window
3. Wait for more than 1 minute
4. Switch back to the application tab
5. **Expected**: 
   - Immediately upon returning, session expiry is detected
   - Toast notification appears
   - You are redirected to the login page

### Test Case 4: Browser Close and Reopen (Within 1 Minute)
1. Log in to the application
2. Close the browser/tab completely
3. Immediately reopen the browser and go to the app
4. **Expected**: 
   - You are not logged in (sessionStorage was cleared)
   - You must log in again

### Test Case 5: Browser Close and Reopen (After 1 Minute)
1. Log in to the application
2. Close the browser/tab completely
3. Wait for more than 1 minute
4. Reopen the browser and go to the app
5. **Expected**: 
   - You are not logged in
   - You must log in again

### Test Case 6: Multiple Tabs
1. Log in to the application in one tab
2. Open another tab with the application
3. Interact with tab 1, but not tab 2 for > 1 minute
4. **Expected**: 
   - Tab 2 will detect inactivity and log out
   - Tab 1 remains logged in (if you were active there)
   - Note: `sessionStorage` is shared across tabs in same window, but each tab tracks independently

## Configuration

### Adjusting Timeout Duration

To change the timeout duration, edit `src/lib/session-storage.ts`:

```typescript
const SESSION_TIMEOUT_MS = 60 * 1000 // Current: 1 minute

// Examples:
// 30 seconds: 30 * 1000
// 2 minutes: 2 * 60 * 1000
// 5 minutes: 5 * 60 * 1000
```

### Adjusting Check Interval

To change how often the system checks for timeout, edit `src/hooks/use-session-timeout.ts`:

```typescript
// Check for expiry periodically (every 10 seconds)
checkIntervalRef.current = setInterval(() => {
  checkSessionExpiry()
}, 10000) // 10000ms = 10 seconds
```

## Technical Architecture

### Why sessionStorage?
- Automatically cleared when browser/tab closes
- Persists during page refreshes
- Separate from cookies (which are used by NextAuth)
- Simple key-value storage for timestamps

### Why Not localStorage?
- `localStorage` persists even after browser closes
- Would require manual cleanup
- Not suitable for session-based timeout

### Integration with NextAuth
- NextAuth manages authentication state via JWT cookies
- Session timeout adds an additional layer of inactivity-based expiry
- When timeout occurs, calls NextAuth's `signOut()` function
- This properly cleans up all authentication state

## Troubleshooting

### Issue: Session not timing out
**Solution**: 
- Check browser console for errors
- Verify `sessionStorage` is enabled in browser
- Check that the timeout duration is set correctly

### Issue: Getting logged out too quickly
**Solution**: 
- Check if you're actually interacting with the page (moving mouse, clicking)
- Verify the timeout duration in `session-storage.ts`
- Check browser console for any errors in event listeners

### Issue: Toast notification not showing
**Solution**: 
- Verify the Toaster component is rendered in the layout
- Check the `use-toast` hook is working correctly
- Look for console errors

## Security Considerations

1. **Defense in Depth**: This adds client-side timeout to complement NextAuth's server-side session management
2. **HttpOnly Cookies**: NextAuth cookies remain httpOnly for security
3. **No Sensitive Data**: Only timestamps stored in sessionStorage, no tokens or user data
4. **Automatic Cleanup**: All session data cleared on timeout or logout

## Future Enhancements

Possible improvements for the future:
- [ ] Configurable timeout via user settings
- [ ] Warning notification 10 seconds before timeout
- [ ] Option to extend session via modal
- [ ] Different timeout durations for different user roles
- [ ] Activity log/analytics

## Related Files

- `src/lib/auth.ts` - NextAuth configuration
- `src/components/providers.tsx` - Root providers
- `src/app/layout.tsx` - Root layout
- `src/hooks/use-toast.ts` - Toast notifications

## Conclusion

The session timeout feature is now fully implemented and integrated into your application. It provides an additional layer of security by automatically logging out inactive users, while using `sessionStorage` ensures that sessions don't persist after browser closure.

