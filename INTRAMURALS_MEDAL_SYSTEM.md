# Intramurals Official Standings Display Feature

## Overview

This feature adds a comprehensive Intramurals Medal Management System that displays official standings on the main public page (before user login) and provides admin controls for managing teams, events, and medal assignments.

## Features

### 🏁 Public (Main Page) View

- **Intramurals 2025 Official Standings** section appears on the main page
- Only visible when enabled by admin (toggle "Display on Main Page" = ON)
- Three standings sections:
  - 🏆 **Sports Events Standing** - Medal counts from sports events only
  - 🎭 **Socio-Cultural Events Standing** - Medal counts from socio-cultural events only
  - 🥇 **Overall Standing** - Combined total from both categories

Each standing table displays:
- Rank (with special badges for top 3)
- Department/Team Name
- Gold, Silver, Bronze medal counts
- Total Points (computed from medal counts)
- Visual highlights for 1st, 2nd, and 3rd place teams
- Bar chart showing medal distribution (top 10 teams)
- Last updated date/time

**Ranking Logic:**
1. Highest number of Gold medals
2. If tied → highest number of Silver medals
3. If still tied → highest number of Bronze medals

### ⚙️ Admin Panel Controls

Accessible via Dashboard → Intramurals menu item.

**Team Management:**
- Add, edit, or remove departments/teams
- Set team name, logo URL, and color

**Event Management:**
- Add or edit events
- Specify category: "Sports" or "Socio-Cultural"

**Medal Assignment:**
- For each event, assign Gold, Silver, and Bronze winners
- Auto-calculation of medal counts per team per category
- Automatic rank determination based on gold-silver-bronze priority

**Display Settings:**
- Toggle "Show on Main Page" (ON/OFF)
- Automatically updates timestamp when any change is made

## Database Structure

The system uses the following tables:

- `intramurals_teams` - Stores team/department information
- `intramurals_events` - Stores event information with category
- `intramurals_medal_awards` - Links events to medal winners (one per event)
- `intramurals_settings` - Stores visibility settings and last updated timestamp

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration file in your Supabase SQL editor:

```sql
-- Run: intramurals_medal_system_migration.sql
```

This will create all necessary tables, indexes, triggers, and RLS policies.

### 2. Access Admin Panel

1. Log in as an admin user (ADMIN, COLLEGE_ORG, or COURSE_ORG role)
2. Navigate to **Dashboard → Intramurals**
3. You'll see three tabs:
   - **Teams** - Manage departments/teams
   - **Events** - Manage events
   - **Medal Assignment** - Assign medals to events

### 3. Initial Setup Steps

1. **Create Teams:**
   - Go to Teams tab
   - Click "Add Team"
   - Enter team name (e.g., "CAS", "CBA", "CED")
   - Optionally add logo URL and color
   - Save

2. **Create Events:**
   - Go to Events tab
   - Click "Add Event"
   - Enter event name (e.g., "Basketball", "Vocal Solo")
   - Select category: Sports or Socio-Cultural
   - Save

3. **Assign Medals:**
   - Go to Medal Assignment tab (or click medal icon in Events tab)
   - Select an event
   - Choose Gold, Silver, and Bronze winners
   - Save

4. **Enable Public Display:**
   - In the Display Settings card at the top
   - Toggle "Display on Main Page" to ON
   - Standings will now appear on the main public page

## API Endpoints

### Public Endpoints

- `GET /api/intramurals/standings` - Fetch standings (public, no auth required)
  - Returns: `{ visible: boolean, last_updated: string, standings: { sports, socio_cultural, overall } }`

### Admin Endpoints (Requires Authentication)

**Teams:**
- `GET /api/intramurals/admin/teams` - List all teams
- `POST /api/intramurals/admin/teams` - Create team
- `PUT /api/intramurals/admin/teams/[id]` - Update team
- `DELETE /api/intramurals/admin/teams/[id]` - Delete team

**Events:**
- `GET /api/intramurals/admin/events` - List all events with medal awards
- `POST /api/intramurals/admin/events` - Create event
- `PUT /api/intramurals/admin/events/[id]` - Update event
- `DELETE /api/intramurals/admin/events/[id]` - Delete event

**Medals:**
- `POST /api/intramurals/admin/medals` - Assign/update medals for an event

**Settings:**
- `GET /api/intramurals/admin/settings` - Get display settings
- `PUT /api/intramurals/admin/settings` - Update display settings

## Components

### Public Components

- `src/components/intramurals/IntramuralsStandings.tsx` - Main standings display component
  - Used in: `src/app/page.tsx` (main public page)

### Admin Components

- `src/components/intramurals/IntramuralsMedalManagement.tsx` - Admin management interface
  - Used in: `src/app/dashboard/intramurals/page.tsx`

## Features & Design

### Visual Highlights

- **Top 3 Teams:**
  - 1st Place: Gold gradient background with pulsing animation
  - 2nd Place: Silver gradient background
  - 3rd Place: Bronze gradient background

- **Animations:**
  - Fade-in-up animations for standings cards
  - Smooth transitions and hover effects
  - Responsive design for mobile and desktop

### Bar Charts

- Displays top 10 teams with medal distribution
- Color-coded bars: Gold (yellow), Silver (gray), Bronze (amber)
- Interactive tooltips showing exact counts

## Usage Example

1. Admin creates teams: CAS, CBA, CED
2. Admin creates events:
   - "Basketball" (Sports)
   - "Vocal Solo" (Socio-Cultural)
3. Admin assigns medals:
   - Basketball: Gold=CAS, Silver=CBA, Bronze=CED
   - Vocal Solo: Gold=CED, Silver=CAS, Bronze=CBA
4. System automatically calculates:
   - Sports: CAS (1G), CBA (1S), CED (1B)
   - Socio-Cultural: CED (1G), CAS (1S), CBA (1B)
   - Overall: CAS (1G, 1S), CED (1G, 1B), CBA (1S, 1B)
5. Rankings are sorted by Gold → Silver → Bronze
6. When enabled, standings appear on main page

## Notes

- The system automatically updates `last_updated` timestamp when any medal assignment changes
- Deleting a team will also remove all medal awards associated with that team
- Deleting an event will delete its medal awards
- The standings refresh every 5 minutes on the public page
- All operations require appropriate admin role permissions

## Future Enhancements (Optional)

- Export standings as PDF or CSV
- Preview mode before publishing
- Historical standings tracking
- Team logos display in standings
- More detailed statistics and analytics

