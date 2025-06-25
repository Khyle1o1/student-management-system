# Student Management System

A comprehensive web application for managing students, events, attendance, and fees built with Next.js 14, TypeScript, and modern web technologies.

## Features

### Core Features
- **Event Management**: Create and manage academic events, seminars, workshops
- **Attendance Tracking**: Mark attendance via QR codes, barcode scanning, or manual selection
- **Fee Management**: Track organization fees, activity fees, and payment status
- **Student Profiles**: Comprehensive student information and academic history
- **Reports & Analytics**: Generate PDF/Excel reports for attendance and payments
- **Role-based Authentication**: Admin and Student access levels

### Technical Features
- Modern UI with Tailwind CSS and shadcn/ui components
- Real-time data with TanStack Query
- Form validation with React Hook Form + Zod
- Type-safe database operations with Prisma
- Secure authentication with NextAuth.js v5
- Mobile-responsive design
- QR code/barcode scanning for attendance

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3.4+
- **UI Components**: shadcn/ui (Radix UI + CVA)
- **State Management**: Zustand + TanStack Query v5
- **Forms**: React Hook Form v8 + Zod validation
- **Icons**: Lucide React

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM v5
- **Authentication**: NextAuth.js v5
- **File Storage**: Local storage with validation

### Additional Libraries
- **Charts**: Recharts v3
- **PDF Generation**: React-PDF v3
- **QR/Barcode**: html5-qrcode
- **Email**: Resend (optional)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd student-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/student_management?schema=public"
   
   # NextAuth
   NEXTAUTH_SECRET="your-secret-here-change-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Email (Optional)
   RESEND_API_KEY="your-resend-api-key"
   
   # Application
   APP_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev --name init
   
   # (Optional) Seed the database
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main models:

- **User**: Authentication and user management
- **Student**: Student profiles and information
- **Event**: Academic events and activities
- **Attendance**: Attendance tracking per event
- **FeeStructure**: Fee types and amounts
- **Payment**: Payment records and status
- **Report**: Generated reports metadata

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── dashboard/        # Dashboard-specific components
├── lib/                  # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Database client
│   ├── utils.ts          # Helper functions
│   └── validations.ts    # Zod schemas
└── types/                # TypeScript type definitions
```

## Usage

### Admin Features
1. **Dashboard**: View system statistics and quick actions
2. **Student Management**: Add, edit, and manage student records
3. **Event Management**: Create events and track attendance
4. **Fee Management**: Set up fees and track payments
5. **Reports**: Generate attendance and payment reports

### Student Features
1. **Profile**: View personal information and academic status
2. **Attendance**: Check attendance history
3. **Fees**: View payment status and outstanding fees
4. **Events**: See upcoming events and registration status

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Students
- `GET /api/students` - List all students (Admin)
- `POST /api/students` - Create new student (Admin)
- `GET /api/students/[id]` - Get student details
- `PUT /api/students/[id]` - Update student (Admin)
- `DELETE /api/students/[id]` - Soft delete student (Admin)

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (Admin)
- `GET /api/events/[id]` - Get event details
- `PUT /api/events/[id]` - Update event (Admin)

### Attendance
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/event/[id]` - Get event attendance
- `GET /api/attendance/student/[id]` - Get student attendance

### Fees & Payments
- `GET /api/fees` - List fee structures
- `POST /api/fees` - Create fee (Admin)
- `POST /api/payments` - Record payment
- `GET /api/payments/student/[id]` - Get student payments

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
- Use a secure `NEXTAUTH_SECRET`
- Update `DATABASE_URL` to production database
- Set `NEXTAUTH_URL` to your domain
- Configure email service if using notifications

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@yourdomain.com or create an issue in the repository.
