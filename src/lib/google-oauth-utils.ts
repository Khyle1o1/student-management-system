/**
 * Google OAuth Utilities
 * 
 * Helper functions for managing Google OAuth sessions and authentication
 */

// Clear Google OAuth cache by redirecting to Google logout
export function clearGoogleOAuthCache() {
  // For localhost development, we can't use Google's logout redirect
  // Instead, we'll clear local data and redirect to login
  forceGoogleAccountSelection()
  
  // For production, you could use: 
  // const currentUrl = window.location.origin + '/auth/login'
  // window.location.href = `https://accounts.google.com/logout?continue=${encodeURIComponent(currentUrl)}`
  
  // For development (localhost), just redirect to login after clearing cache
  window.location.href = '/auth/login'
}

// Force account selection on next Google login
export function forceGoogleAccountSelection() {
  // Clear local storage items that might cache Google account info
  const googleRelatedKeys = Object.keys(localStorage).filter(key => 
    key.includes('google') || key.includes('oauth') || key.includes('auth')
  )
  
  googleRelatedKeys.forEach(key => {
    localStorage.removeItem(key)
  })

  // Clear session storage as well
  const googleSessionKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('google') || key.includes('oauth') || key.includes('auth')
  )
  
  googleSessionKeys.forEach(key => {
    sessionStorage.removeItem(key)
  })

  console.log('Cleared Google OAuth cache. Next login should prompt for account selection.')
}

// Complete logout that clears everything
export async function completeLogout() {
  // Clear local storage
  forceGoogleAccountSelection()
  
  // Clear cookies by setting them to expire
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });

  // Redirect to Google logout
  clearGoogleOAuthCache()
}

// Check if user needs to clear cache (call this after failed login attempts)
export function suggestClearCache() {
  const message = `
If you're having trouble switching Google accounts:

1. Try "Clear All Sessions" from the sign-out menu
2. Or open browser Developer Tools (F12)
3. Run: forceGoogleAccountSelection()
4. Then try logging in again

This will clear cached Google authentication data.
  `
  
  console.log(message)
  return message
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearGoogleOAuthCache = clearGoogleOAuthCache;
  (window as any).forceGoogleAccountSelection = forceGoogleAccountSelection;
  (window as any).completeLogout = completeLogout;
  (window as any).suggestClearCache = suggestClearCache;
} 