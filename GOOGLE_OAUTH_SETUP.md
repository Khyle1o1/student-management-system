# Google OAuth Setup Guide for Student Management System

## 🔐 Overview

This guide will help you set up Google OAuth authentication with strict student domain validation for the Student Management System.

## ✅ Features Implemented

- **Google OAuth Login**: Only allows Google account authentication
- **Domain Validation**: Restricts access to specific student email domains
- **No Account Creation**: Prevents new user registration during login
- **Database Validation**: Ensures users exist in the system database
- **User-Friendly Errors**: Clear feedback for failed login attempts
- **Secure Authentication**: Uses NextAuth.js v4 with proper token validation

## 🚀 Environment Variables Setup

Create a `.env` file in your project root with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/student_management?schema=public"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Configuration (Optional)
RESEND_API_KEY="your-resend-api-key"

# Application Configuration
APP_URL="http://localhost:3000"
```

## 📝 Google Cloud Console Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google+ API
   - Google OAuth2 API
   - Google People API

### Step 2: Configure OAuth 2.0

1. Navigate to **Credentials** in the left sidebar
2. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
3. Choose **Web application** as the application type
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**

### Step 3: Configure OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Choose **Internal** (for organizational use) or **External**
3. Fill in required fields:
   - App name: "Student Management System"
   - User support email: your-email@domain.com
   - Developer contact information
4. Add scopes:
   - `email`
   - `profile`
   - `openid`

## ⚙️ Student Domain Configuration

### Update Domain Settings

In `src/lib/auth.ts`, change the `ALLOWED_STUDENT_DOMAIN` constant:

```typescript
// Change this to your institution's email domain
const ALLOWED_STUDENT_DOMAIN = "@student.university.edu" // Replace with your domain
```

### Examples of Valid Domains

- `@student.buksu.edu.ph` (current configuration)
- `@student.university.edu`
- `@students.college.edu`
- `@edu.institution.org`
- `@learner.school.edu`

## 🗄️ Database Requirements

### Ensure Student Records Exist

Before users can log in, they must:

1. **Exist in the `users` table** with:
   - Valid email matching the student domain
   - Role set to `STUDENT`
   - Account not deleted (`deletedAt` is null)

2. **Have a corresponding `student` record** linked to the user

### Sample SQL to Create Test Student

```sql
-- 1. Create user record
INSERT INTO users (id, email, password, role, name, "createdAt", "updatedAt")
VALUES (
  'cuid-example-user-id',
  'john.doe@student.buksu.edu.ph',  -- Must match your domain
  '',  -- Empty password for OAuth-only users
  'STUDENT',
  'John Doe',
  NOW(),
  NOW()
);

-- 2. Create student record
INSERT INTO students (id, "studentId", "userId", name, email, "yearLevel", section, course, "createdAt", "updatedAt")
VALUES (
  'cuid-example-student-id',
  'STU-2024-001',  -- Student ID number
  'cuid-example-user-id',  -- Must match user.id above
  'John Doe',
  'john.doe@student.buksu.edu.ph',
  'FIRST_YEAR',
  'A',
  'Computer Science',
  NOW(),
  NOW()
);
```

## 🔒 Security Features

### Login Validation Process

1. **Domain Check**: Email must end with allowed student domain
2. **Database Existence**: User must exist in the database
3. **Role Verification**: User role must be `STUDENT`
4. **Account Status**: Account must be active (not deleted)
5. **Student Record**: Must have corresponding student profile

### Error Handling

The system provides specific error messages:

- ❌ "Login failed: Only registered student emails can access the system."
- ❌ Domain validation failures
- ❌ Missing user records
- ❌ Invalid role assignments

## 🧪 Testing the Setup

### Test Cases

1. **Valid Student Login**: 
   - Use Google account with registered student email
   - Should redirect to `/dashboard`

2. **Invalid Domain**:
   - Use Google account with non-student domain
   - Should redirect to `/auth/error` with appropriate message

3. **Unregistered Email**:
   - Use valid domain but unregistered email
   - Should show error message

4. **Non-Student Role**:
   - User exists but role is `ADMIN`
   - Should deny access

### Development Testing

```bash
# Start development server
npm run dev

# Visit login page
open http://localhost:3000/auth/login

# Test Google OAuth button
# Use test student account with valid domain
```

## 🚀 Production Deployment

### Environment Variables for Production

- Set secure `NEXTAUTH_SECRET` (32+ character random string)
- Update `NEXTAUTH_URL` to your production domain
- Use production Google OAuth credentials
- Ensure database is properly configured

### Security Checklist

- ✅ Secure database connection
- ✅ Strong NextAuth secret
- ✅ Production Google OAuth credentials
- ✅ HTTPS enabled
- ✅ Domain validation configured
- ✅ Student records populated

## 🛠️ Troubleshooting

### Common Issues

1. **"Login failed" Error**:
   - Check if user exists in database
   - Verify email domain matches configuration
   - Confirm user role is `STUDENT`

2. **Google OAuth Errors**:
   - Verify redirect URIs in Google Console
   - Check client ID and secret
   - Ensure APIs are enabled

3. **Database Connection Issues**:
   - Verify `DATABASE_URL` format
   - Check database connectivity
   - Run Prisma migrations

### Debug Mode

Enable debug logging in `src/lib/auth.ts` to see detailed authentication flow:

```typescript
// The auth configuration already includes console.log statements
// Check your server console for authentication flow details
```

## 📞 Support

If you encounter issues:

1. Check the error logs in your console
2. Verify all environment variables are set
3. Ensure database schema is up to date
4. Contact your system administrator for student domain verification

---

**Important**: Only students with pre-registered accounts and valid institutional email addresses can access the system. No new account creation is allowed during the login process. 