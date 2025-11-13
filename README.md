# SmartU

A modern web application for managing student records, attendance, and fee payments.

## Features

- Student enrollment and profile management
- Attendance tracking with QR code scanning
- Fee management and payment tracking
- Event scheduling and management
- **Automated Email Reminders** (Event, Fee, Certificate notifications)
- Role-based access control (Admin/Student)
- Real-time dashboard with statistics
- Export data to CSV/Excel
- Batch import students
- Google OAuth integration

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **UI Components**: Radix UI with Tailwind CSS
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: PostgreSQL with Supabase
- **Email**: Nodemailer with responsive HTML templates
- **State Management**: React Query & Zustand
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts
- **PDF Generation**: React-PDF
- **QR Code**: HTML5-QRCode

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/yourusername/student-management-system.git
cd student-management-system
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Create .env file and add:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

4. Start the development server
```bash
npm run dev
```

## Database Setup

1. Create a new project in Supabase
2. Use the SQL editor to run `schema.sql` to create the required tables:
   - Users
   - Students
   - Events
   - Attendance
   - Fee Structures
   - Payments
3. **Upload real student data** - See [Quick Upload Guide](./QUICK_UPLOAD_GUIDE.md) or [Complete Upload Guide](./REAL_STUDENT_DATA_UPLOAD_GUIDE.md)

## Authentication Setup

1. Configure Google OAuth in the Google Cloud Console
2. Add the credentials to your environment variables
3. See `GOOGLE_OAUTH_SETUP.md` for detailed instructions

## Email Notification System

SmartU includes an automated email reminder system that sends notifications to students for:
- Events (1 day and 1 hour reminders)
- Fees (assignment and 3-day reminders)
- Certificates (ready for download)

**Setup Instructions:**
1. See [EMAIL_REMINDERS_SETUP.md](./EMAIL_REMINDERS_SETUP.md) for detailed configuration
2. See [NOTIFICATION_SYSTEM_README.md](./NOTIFICATION_SYSTEM_README.md) for system documentation
3. Configure SMTP settings in `.env`
4. Run the database migration (`sql/notification_system.sql`)
5. Set up automated scheduler (cron job)
6. Access admin panel at `/dashboard/notifications/settings`

## Deployment

1. Push your code to GitHub
2. Deploy to Vercel or your preferred hosting platform
3. Set up the environment variables in your hosting platform
4. Configure the database connection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
