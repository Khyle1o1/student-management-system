# Automated User Cleanup Cron Job

This document explains how to set up automated cleanup of users who have been archived for 2+ years.

## Overview

The system includes an automated cleanup job that permanently deletes (soft delete) users who have been in `ARCHIVED` status for 2 or more years. This helps maintain database hygiene while preserving audit trails.

## How It Works

1. **Cron Endpoint**: `/api/cron/cleanup-archived-users`
2. **Schedule**: Every Sunday at midnight (configurable)
3. **Action**: Sets `deleted_at` timestamp for users archived 2+ years ago
4. **Audit**: Logs all deletions in `user_audit_log` table

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

If deploying to Vercel, the cron job is already configured in `vercel-cron.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-archived-users",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

**To enable:**
1. Deploy to Vercel
2. Vercel will automatically detect and run the cron job

### Option 2: GitHub Actions

Create `.github/workflows/cleanup-users.yml`:

```yaml
name: Cleanup Archived Users

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/cleanup-archived-users
```

### Option 3: External Cron Service

Use services like:
- **cron-job.org**
- **EasyCron**
- **Render Cron Jobs**

Configure them to call:
```
GET https://your-domain.com/api/cron/cleanup-archived-users
```

### Option 4: Manual Execution

You can manually trigger the cleanup by calling the endpoint:

```bash
curl https://your-domain.com/api/cron/cleanup-archived-users
```

## Security

### Adding Authentication (Recommended)

1. Add a `CRON_SECRET` environment variable:
   ```
   CRON_SECRET=your-secure-random-string
   ```

2. When calling the endpoint, include the authorization header:
   ```bash
   curl -H "Authorization: Bearer your-secure-random-string" \
     https://your-domain.com/api/cron/cleanup-archived-users
   ```

## Cron Schedule Syntax

The schedule uses standard cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of the month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Common Schedules

- `0 0 * * 0` - Every Sunday at midnight
- `0 2 * * *` - Every day at 2:00 AM
- `0 0 1 * *` - First day of every month at midnight
- `0 0 * * 1` - Every Monday at midnight

## Response Format

### Success Response

```json
{
  "message": "Successfully deleted 5 user(s)",
  "deleted_count": 5,
  "deleted_users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "archived_at": "2021-11-03T00:00:00.000Z"
    }
  ]
}
```

### No Users to Delete

```json
{
  "message": "No users to delete",
  "deleted_count": 0,
  "deleted_users": []
}
```

## Monitoring

Check the `user_audit_log` table for cleanup actions:

```sql
SELECT * FROM user_audit_log
WHERE action = 'USER_AUTO_DELETED'
ORDER BY created_at DESC;
```

## Testing

To test the cleanup job without waiting 2 years:

1. Manually set a user's `archived_at` to 3 years ago:
   ```sql
   UPDATE users
   SET archived_at = NOW() - INTERVAL '3 years',
       status = 'ARCHIVED'
   WHERE id = 'test-user-id';
   ```

2. Call the cleanup endpoint:
   ```bash
   curl https://your-domain.com/api/cron/cleanup-archived-users
   ```

3. Verify the user was soft-deleted:
   ```sql
   SELECT id, email, archived_at, deleted_at
   FROM users
   WHERE id = 'test-user-id';
   ```

## Notes

- The cleanup job uses **soft delete** (`deleted_at` timestamp), not hard delete
- All actions are logged in `user_audit_log` for audit purposes
- Users with `deleted_at` set will not be accessible through the API
- Database administrators can still query deleted users if needed

