# Rating Question Type Feature

## Overview
Added a new **Rating** question type to the evaluation forms system with customizable icon styles (⭐ Star, ❤️ Heart, 👍 Thumbs Up).

## Features

### Form Builder
- New question type: "Rating (Star/Heart/Thumbs)"
- Configurable options:
  - **Rating Style**: Choose between Star ⭐, Heart ❤️, or Thumbs Up 👍
  - **Number of Icons**: Select 3, 5, or 10 rating levels
  - **Live Preview**: See how the rating will appear to respondents

### Form Response
- Interactive rating selection with hover effects
- Icons highlight on hover and selection
- Visual feedback showing selected rating (e.g., "You selected: 4 / 5")
- Smooth animations and scale effects

### Statistics Dashboard
- **Summary Cards**:
  - Average Rating with icon
  - Median with icon
  - Most Common rating
  - Total number of ratings
- **Distribution Chart**: Bar chart showing count of each rating level
- **Visual Summary**: Display of average rating using filled/unfilled icons
- Color-coded chart (gold #FFBB28 for ratings)

## Technical Implementation

### Files Modified

1. **`src/components/forms/FormBuilder.tsx`**
   - Added `rating_style` to Question interface
   - Added 'rating' to question types enum
   - Added rating configuration UI (style selector, max value selector)
   - Added preview rendering for rating questions

2. **`src/components/forms/FormResponse.tsx`**
   - Created `RatingInput` component for interactive rating selection
   - Added hover state management
   - Added rating case to question rendering

3. **`src/components/forms/FormStatistics.tsx`**
   - Added `renderRatingStats` function
   - Display rating-specific statistics with icons
   - Visual summary showing average rating with filled icons

4. **`src/app/api/forms/[id]/statistics/route.ts`**
   - Added 'rating' case to statistics calculation
   - Treats ratings like linear_scale (numeric analysis)
   - Includes `rating_style` in response for proper icon display

5. **`src/app/api/forms/route.ts`**
   - Added 'rating' to question type enum in Zod schema
   - Added `rating_style` field validation
   - Added validation to ensure rating questions have max_value and rating_style

6. **`src/app/api/forms/[id]/route.ts`**
   - Updated Zod schema to match route.ts
   - Added rating type and rating_style support

## Database Schema
No database migration needed! The rating data is stored in the existing JSONB fields:
- `questions` array stores rating configuration (type, rating_style, max_value)
- `answers` JSONB stores numeric rating values (1-5, 1-10, etc.)

## Usage Example

### Creating a Rating Question
```typescript
{
  id: "q1",
  type: "rating",
  question: "How would you rate this course?",
  description: "Please rate from 1 to 5 stars",
  required: true,
  rating_style: "star",
  max_value: 5
}
```

### Response Data
```json
{
  "q1": 4  // User selected 4 stars
}
```

### Statistics Output
```json
{
  "question_id": "q1",
  "question_type": "rating",
  "rating_style": "star",
  "statistics": {
    "average": "4.25",
    "median": "4.00",
    "mode": 5,
    "distribution": [
      { "value": 1, "count": 2, "percentage": "10.00" },
      { "value": 2, "count": 1, "percentage": "5.00" },
      { "value": 3, "count": 3, "percentage": "15.00" },
      { "value": 4, "count": 6, "percentage": "30.00" },
      { "value": 5, "count": 8, "percentage": "40.00" }
    ],
    "min": 1,
    "max": 5
  }
}
```

## UI/UX Highlights
- **Hover Effects**: Icons scale up and highlight on hover
- **Visual Feedback**: Selected rating is clearly indicated
- **Responsive**: Works on both desktop and mobile
- **Accessible**: Keyboard navigable buttons
- **Intuitive**: Similar to popular rating systems (Amazon, Yelp, etc.)

## Future Enhancements
- Half-star/heart/thumbs ratings
- Custom rating labels for each level
- Different color schemes per rating style
- Rating tooltips (e.g., "Poor", "Good", "Excellent")

