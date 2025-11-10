# Event Evaluation Dropdown Fix

## Problem
When creating or editing an event, the "Select Evaluation Template" dropdown was not showing newly created forms. It only showed old evaluations and didn't refresh.

## Root Causes
1. **Wrong API Endpoint**: The event form was fetching from `/api/evaluations` (old system) instead of `/api/forms` (new forms system)
2. **No Refresh Mechanism**: Evaluations were only loaded once on component mount, with no way to refresh the list
3. **Stale Data**: After creating a new form, there was no way to see it in the dropdown without reloading the entire page

## Solution Implemented

### 1. Updated API Fetching (`src/components/dashboard/event-form.tsx`)
```typescript
// Now fetches from BOTH endpoints for backward compatibility
const fetchEvaluations = useCallback(async () => {
  setLoadingEvaluations(true)
  try {
    // Fetch from new forms API (PUBLISHED forms only)
    const formsResponse = await fetch('/api/forms?status=PUBLISHED&limit=100')
    
    // Also try old evaluations API for backward compatibility
    const evalResponse = await fetch('/api/evaluations?templates_only=true&limit=100')
    
    // Combine both lists, removing duplicates by ID
    const combined = [...formsList, ...evalList]
    const uniqueEvals = combined.reduce((acc, current) => {
      if (!acc.find(item => item.id === current.id)) {
        acc.push(current)
      }
      return acc
    }, [])
    
    setEvaluations(uniqueEvals)
  } catch (error) {
    console.error('Error fetching evaluations:', error)
  } finally {
    setLoadingEvaluations(false)
  }
}, [])
```

### 2. Added Refresh Button
- Added a "Refresh" button next to the dropdown label
- Button shows a spinning icon while loading
- Users can manually refresh the list after creating new forms

```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="evaluation_id">Select Evaluation Template *</Label>
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={fetchEvaluations}
    disabled={loadingEvaluations}
    className="h-8 px-2"
  >
    <RefreshCw className={`h-4 w-4 ${loadingEvaluations ? 'animate-spin' : ''}`} />
    <span className="ml-1 text-xs">Refresh</span>
  </Button>
</div>
```

### 3. Auto-Refresh on Enable
- Automatically refreshes the evaluations list when "Require evaluation for certificate access" is enabled
- Ensures the list is always up-to-date when users need it

```typescript
// If require_evaluation is enabled, refresh the evaluations list
if (field === 'require_evaluation' && value) {
  fetchEvaluations()
}
```

### 4. Updated Link
- Changed the "Create one first" link from `/dashboard/evaluations/new` to `/dashboard/forms/new`
- Now points to the new forms creation page
- Opens in a new tab so users don't lose their event form progress

## User Experience Improvements

### Before Fix
❌ Only showed old evaluations  
❌ Couldn't see newly created forms  
❌ Had to reload the entire page  
❌ No feedback when forms were missing  

### After Fix
✅ Shows ALL published forms (both old and new)  
✅ Refresh button to manually reload the list  
✅ Auto-refreshes when checkbox is enabled  
✅ Spinning icon shows loading state  
✅ Link opens in new tab (preserves event form data)  

## Testing Checklist

1. ✅ Create a new event
2. ✅ Check "Require evaluation for certificate access"
3. ✅ Verify that the dropdown shows all PUBLISHED forms
4. ✅ Create a new form (in new tab)
5. ✅ Publish the form
6. ✅ Click "Refresh" button in event form
7. ✅ Verify new form appears in dropdown
8. ✅ Select the form and create event successfully

## Technical Details

### Files Modified
- `src/components/dashboard/event-form.tsx`
  - Updated `fetchEvaluations` function
  - Added `RefreshCw` icon import
  - Added refresh button UI
  - Added auto-refresh on checkbox enable
  - Updated "Create one first" link

### API Endpoints Used
- `/api/forms?status=PUBLISHED&limit=100` - New forms system (primary)
- `/api/evaluations?templates_only=true&limit=100` - Old system (fallback)

### Backward Compatibility
The solution maintains backward compatibility by:
- Fetching from both old and new APIs
- Merging results and removing duplicates
- Gracefully handling errors from either endpoint
- Not breaking existing evaluations created in the old system

## Notes
- Only PUBLISHED forms appear in the dropdown (DRAFT and CLOSED are filtered out)
- The solution is backward compatible with the old evaluations system
- Forms and evaluations are combined into a single list
- Duplicates are removed based on ID

