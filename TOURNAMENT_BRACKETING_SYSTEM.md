# Tournament Bracketing System

## Overview

This feature enhances the Intramurals Medal Management System with comprehensive tournament bracketing capabilities similar to Challonge.com. The system supports multiple bracket types, team randomization, automatic bracket generation, and automatic medal assignment based on tournament results.

## Features

### 🏆 Tournament Creation & Randomization

- **Bracket Types:**
  - Single Elimination
  - Double Elimination
  - Round Robin

- **Randomization:**
  - Toggle to automatically shuffle teams for first-round matchups
  - Manual seeding option when randomization is OFF
  - Reshuffle bracket multiple times before locking
  - Track `randomize_count` with configurable `max_random_attempts` (default: 5)
  - Display counter: "Randomizations used: X / Y"

- **Bracket Locking:**
  - Admin clicks "Lock Bracket" → Bracket is fixed
  - Tournament officially starts after locking
  - No further randomization allowed after locking

### 🎯 Automatic Bracket Generation & Match Management

- **First-Round Matches:**
  - Automatically generated after randomization or manual seeding
  - Support for byes when odd-numbered participants

- **Winner Advancement:**
  - Winners automatically advance to next rounds
  - System handles bracket progression automatically, including third-place playoffs

- **Match Results:**
  - Admin enters match results per round
  - Supports score entry (optional)
  - Winner selection updates bracket automatically, including feeding semifinal losers into a third-place match

- **Automatic Medal Assignment:**
  - **Gold** → Winner of final match
  - **Silver** → Runner-up (loser of final)
  - **Bronze** → 
    - Single Elimination: 3rd place playoff winner (fallback to semifinal logic if no playoff)
    - Double Elimination: 3rd place match winner
    - Round Robin: 3rd place by standings

### 📊 Public Bracket Display

- Interactive bracket visualization:
  - Matches organized by rounds
  - Visual connection lines between rounds
  - Winners highlighted
  - Hover shows team names, match results, and round info
  - Responsive design:
    - Collapsible rounds for mobile
    - Horizontal scrolling for large brackets

### 🔧 Database & API Enhancements

#### Database Schema

**New/Modified Tables:**

1. **intramurals_events** (modified):
   - `is_tournament` (boolean) - Indicates if event is a tournament
   - `bracket_type` (varchar) - Type of bracket
   - `randomize_teams` (boolean) - Whether to randomize teams
   - `randomize_locked` (boolean) - Whether bracket is locked
   - `randomize_count` (integer) - Number of randomizations used
   - `max_random_attempts` (integer, default 5) - Max randomization attempts

2. **intramurals_tournament_teams** (new):
   - Links teams to tournaments
   - Stores seed positions
   - `tournament_id`, `team_id`, `seed`

3. **intramurals_matches** (new):
   - Stores all tournament matches
   - Fields: `round`, `match_number`, `team1_id`, `team2_id`, `winner_id`, `team1_score`, `team2_score`, `is_bye`, `next_match_id`, `next_match_position`, `loser_next_match_id`, `loser_next_match_position`, `is_third_place`, `status`

#### API Endpoints

**Admin Endpoints (Requires Authentication):**

- `POST /api/intramurals/admin/tournaments` - Create tournament
  - Body: `{ name, category, bracket_type, team_ids, randomize_teams, max_random_attempts }`
  
- `POST /api/intramurals/admin/tournaments/[id]/randomize` - Reshuffle bracket
  - Checks randomization limits
  - Returns updated bracket structure

- `POST /api/intramurals/admin/tournaments/[id]/lock` - Lock bracket
  - Prevents further randomization
  - Tournament can now begin

- `PUT /api/intramurals/admin/matches/[id]` - Enter match result
  - Body: `{ winner_id, team1_score, team2_score }`
  - Automatically advances winner to next round

**Public Endpoints:**

- `GET /api/intramurals/brackets?event_id=[id]` - Fetch bracket structure
  - Returns tournament info, teams, matches organized by round
  - Public access (no authentication required)
- `GET /api/intramurals/tournaments` - List available tournaments for public display
  - Returns tournament summaries with match counts and rounds
  - Used by the homepage to select a featured bracket

### 🎨 Admin UI Enhancements

**Tournament Management Interface:**

- New "Tournaments" tab in Intramurals management
- Tournament list with:
  - Tournament name, category, bracket type
  - Lock status
  - Creation date
  - "View Bracket" action

- Bracket Management:
  - Preview bracket with first-round matchups
  - "Randomize Again" button (disabled after max attempts)
  - "Lock Bracket" button
  - Enter match results per round
  - Medal assignment summary based on tournament progression

- Tournament Creation Dialog:
  - Select tournament name and category
  - Choose bracket type
  - Toggle randomization
  - Set max randomization attempts
  - Select participating teams (minimum 2)

### 🔗 Integration

- **Existing Medal System:**
  - Tournament results automatically update medal awards
  - Medals integrated into existing standings calculation
  - Sports, Socio-Cultural, and Overall standings updated automatically

- **Public Display:**
  - Brackets can be displayed on public pages
  - Uses `PublicTournamentBracket` component
  - Fully responsive and interactive

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration file in your Supabase SQL editor:

```sql
-- Run: intramurals_tournament_bracketing_migration.sql
```

This will:
- Add tournament fields to `intramurals_events`
- Create `intramurals_tournament_teams` table
- Create `intramurals_matches` table
- Set up triggers for automatic winner advancement
- Set up triggers for automatic medal assignment
- Configure RLS policies

### 2. Access Tournament Management

1. Log in as an admin user (ADMIN, COLLEGE_ORG, or COURSE_ORG role)
2. Navigate to **Dashboard → Intramurals**
3. Click on the **Tournaments** tab
4. Click **Create Tournament** to start

### 3. Create a Tournament

1. **Fill in Tournament Details:**
   - Tournament name (e.g., "Basketball Championship")
   - Category: Sports or Socio-Cultural
   - Bracket type: Single Elimination, Double Elimination, or Round Robin
   - Toggle "Randomize Teams" if desired
   - Set max randomization attempts (default: 5)

2. **Select Teams:**
   - Select at least 2 teams to participate
   - Teams will be seeded based on selection order (if not randomizing)

3. **Create Tournament:**
   - Click "Create Tournament"
   - Bracket will be automatically generated

### 4. Manage Tournament Bracket

1. **View Bracket:**
   - Click "View Bracket" on any tournament
   - See the complete bracket structure

2. **Randomize (if unlocked):**
   - Click "Randomize Again" to reshuffle teams
   - Counter shows: "Randomizations used: X / Y"
   - Button disabled after max attempts

3. **Lock Bracket:**
   - Click "Lock Bracket" when ready to start
   - Bracket becomes fixed
   - Tournament can now begin

4. **Enter Match Results:**
   - Click on any match card
   - Select winner
   - Enter scores (optional)
   - Save result
   - Winner automatically advances to next round

5. **Third Place & Automatic Medals:**
   - Semifinal losers automatically populate a third-place playoff
   - Final and bronze matches completed: CAS wins final, CED wins bronze
   - System automatically assigns:
     - Gold: CAS (champion)
     - Silver: CBA (runner-up)
     - Bronze: CED (third-place winner)

## Usage Example

1. **Create Tournament:**
   - Admin creates "Basketball Championship" tournament
   - Selects 8 teams: CAS, CBA, CED, CEA, CBA, CED, etc.
   - Chooses Single Elimination bracket
   - Enables randomization

2. **Randomize Bracket:**
   - Admin clicks "Randomize Again" 2 times
   - Counter shows: "Randomizations used: 2 / 5"
   - Admin is satisfied with bracket

3. **Lock Bracket:**
   - Admin clicks "Lock Bracket"
   - Bracket is now fixed
   - Tournament can begin

4. **Enter Results:**
   - Round 1: Admin enters results for all first-round matches
   - Winners automatically advance to Round 2
   - Round 2: Admin enters results
   - Process continues until final

5. **Third Place & Automatic Medals:**
   - Semifinal losers automatically populate a third-place playoff
   - Final and bronze matches completed: CAS wins final, CED wins bronze
   - System automatically assigns:
     - Gold: CAS (champion)
     - Silver: CBA (runner-up)
     - Bronze: CED (third-place winner)
   - Medals appear in standings automatically

## Components

### Admin Components

- `src/components/intramurals/TournamentCreationDialog.tsx` - Tournament creation dialog
- `src/components/intramurals/TournamentBracket.tsx` - Admin bracket management interface
- `src/components/intramurals/IntramuralsMedalManagement.tsx` - Updated with Tournaments tab

### Public Components

- `src/components/intramurals/PublicTournamentBracket.tsx` - Public bracket display

### Utilities

- `src/lib/tournament-bracket.ts` - Bracket generation logic

## Technical Details

### Bracket Generation

- **Single Elimination:**
  - Rounds up to next power of 2
  - Handles byes automatically
  - Proper seeding when not randomizing
  - Automatically adds a third-place playoff fed by semifinal losers

- **Double Elimination:**
  - Currently uses single elimination structure
  - Can be enhanced with full losers bracket

- **Round Robin:**
  - Each team plays every other team once
  - All matches in round 1

### Automatic Winner Advancement

- Trigger-based system
- When match is completed with winner:
  - Winner automatically placed in next match
  - Position determined by `next_match_position` (1 or 2)

### Automatic Medal Assignment

- Trigger-based system
- When final match is completed:
  - Gold: Winner of final
  - Silver: Loser of final
  - Bronze: Based on bracket type (third-place playoff winner when available)
  - Updates `intramurals_medal_awards` table
  - Automatically updates standings

## Notes

- Tournament brackets must be locked before entering match results
- Randomization is limited to prevent abuse
- Byes are automatically handled for odd-numbered teams
- Medal assignment is automatic and cannot be manually overridden for tournaments
- All tournament operations require appropriate admin role permissions
- Public bracket display is read-only

## Future Enhancements (Optional)

- Full double elimination bracket with losers bracket
- Round robin standings calculation
- Tournament scheduling with dates/times
- Live bracket updates via WebSocket
- Bracket export (PDF/PNG)
- Tournament statistics and analytics
- Custom bracket seeding
- Tournament templates

