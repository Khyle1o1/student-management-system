# Quick Start Guide

This guide will help you get the Student Management System up and running quickly.

## Prerequisites

- Node.js 18+ and npm
- A Supabase account
- A Google Cloud account (for OAuth)

## Setup Steps

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/student-management-system.git
   cd student-management-system
   npm install
   ```

2. **Set up Supabase**
   - Create a new project in Supabase
   - Get your project URL and anon key
   - Create the required tables using the SQL editor:
     - Users (for authentication)
     - Students (for student records)
     - Events (for attendance tracking)
     - Attendance (for attendance records)
     - Fee Structures (for fee management)
     - Payments (for payment tracking)

3. **Configure Environment Variables**
   ```bash
   # Create .env file with:
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Set up Google OAuth**
   - Follow the instructions in `GOOGLE_OAUTH_SETUP.md`
   - Add the credentials to your environment variables

5. **Start the Development Server**
   ```bash
   npm run dev
   ```

6. **First-time Setup**
   - Open http://localhost:3000
   - Sign in with Google or create an admin account
   - Start adding students and managing your system

## Basic Usage

1. **Student Management**
   - Add students individually or use batch import
   - Manage student profiles and academic information
   - View student attendance and payment history

2. **Attendance Tracking**
   - Create events for attendance tracking
   - Use QR codes for easy attendance marking
   - Generate attendance reports

3. **Fee Management**
   - Set up fee structures
   - Record and track payments
   - Generate payment reports

4. **Reports and Analytics**
   - View dashboard statistics
   - Export data to CSV/Excel
   - Generate detailed reports

## Common Issues

1. **Authentication Issues**
   - Verify your Google OAuth credentials
   - Check the callback URLs in Google Cloud Console
   - Ensure environment variables are set correctly

2. **Database Issues**
   - Check your Supabase connection settings
   - Verify table structures and relationships
   - Check for any missing tables or columns

3. **Development Issues**
   - Clear your browser cache
   - Delete .next folder and rebuild
   - Check console for error messages

## Next Steps

1. Read the full documentation in README.md
2. Explore advanced features and customization options
3. Join our community for support and updates

For more detailed information, refer to the full documentation in the repository.

## 🚀 Get Started in 5 Minutes

### 1. Environment Setup
Create a `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/student_management?schema=public"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# If you have PostgreSQL running:
npx prisma migrate dev --name init

# For testing without database (will show errors but app will load):
npm run dev
```

### 3. Start Development Server
```bash
npm run dev
```
Visit: http://localhost:3000

## 🎯 Default Features Ready

### ✅ Authentication System
- **Login Page**: `/auth/login`
- **Role-based Access**: Admin vs Student views
- **Session Management**: NextAuth.js v5

### ✅ Admin Dashboard
- **Student Management**: Add, edit, view students
- **Event Management**: Create academic events
- **Attendance Tracking**: Manual and QR code scanning ready
- **Fee Management**: Track payments and dues
- **Reports**: Export-ready functionality

### ✅ Student Dashboard
- **Personal Profile**: View student information
- **Attendance History**: Track event participation
- **Fee Status**: Monitor payment obligations
- **Academic Progress**: Overview statistics

### ✅ Modern UI Components
- **Responsive Design**: Mobile-first approach
- **Tailwind CSS**: Modern styling system
- **shadcn/ui**: Professional component library
- **Form Validation**: React Hook Form + Zod

## 🔧 Tech Stack Implemented

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (configurable)
- **Authentication**: NextAuth.js v5
- **State Management**: TanStack Query + Zustand
- **Validation**: Zod schemas
- **UI**: shadcn/ui components

## 📝 Test Data Setup

### Create Admin User (Manual)
1. Register a user
2. Update database: `UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com'`

### Create Test Student
Use the admin dashboard or API endpoint:
```json
{
  "name": "John Doe",
  "studentId": "STU001",
  "email": "john@test.com",
  "yearLevel": "FIRST_YEAR",
  "section": "A",
  "course": "Computer Science"
}
```

## 🚧 Development Notes

- **Database**: App expects PostgreSQL but can be adapted
- **QR Scanner**: html5-qrcode library integrated (needs HTTPS for camera)
- **Reports**: React-PDF ready for implementation
- **Email**: Resend integration prepared
- **File Upload**: Ready for implementation

## 📱 Mobile Ready

The application is fully responsive and works on:
- Desktop browsers
- Tablet devices  
- Mobile phones
- PWA capability ready

## 🔐 Security Features

- **Password Hashing**: bcryptjs
- **Session Security**: JWT with secure cookies
- **Input Validation**: Client and server-side
- **CSRF Protection**: Built into NextAuth
- **Role-based Authorization**: Admin/Student separation

## 📊 Analytics & Reports

### Ready for Implementation:
- Attendance rate calculations
- Fee collection tracking  
- Student performance metrics
- Event participation statistics
- Export to PDF/Excel formats

## 🎨 Customization

### Styling
- Modify `tailwind.config.ts` for theme changes
- Update CSS variables in `globals.css`
- Component variants in `ui/` folder

### Features  
- Add new user roles in Prisma schema
- Extend API routes in `app/api/`
- Create new dashboard sections
- Implement additional reports

## 🐛 Common Issues

1. **Database Connection**: Ensure PostgreSQL is running
2. **Environment Variables**: Check `.env` file exists
3. **Prisma Client**: Run `npx prisma generate` after schema changes
4. **Port Conflicts**: Change port in `package.json` if needed

## 📞 Support

- Check `README.md` for full documentation
- Review API documentation in `/api` routes
- Database schema in `prisma/schema.prisma`
- Component library in `src/components/ui/` 