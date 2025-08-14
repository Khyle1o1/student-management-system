# Deployment Guide for Render

This guide will help you deploy your Student Management System to Render.

## Prerequisites

1. A Render account
2. A Supabase project set up
3. Google OAuth credentials configured
4. Resend API key for email functionality

## Environment Variables

You'll need to set up the following environment variables in your Render dashboard:

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_URL=https://your-app-name.onrender.com
NEXTAUTH_SECRET=your_nextauth_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
RESEND_API_KEY=your_resend_api_key
NODE_ENV=production
```

### How to Get These Values

1. **Supabase Configuration**:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the Project URL and anon/public key

2. **NextAuth Secret**:
   - Generate a random string: `openssl rand -base64 32`
   - Or use any secure random string

3. **Google OAuth**:
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add your Render domain to authorized redirect URIs

4. **Resend API Key**:
   - Sign up at resend.com
   - Generate an API key from your dashboard

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Connect your repository to Render
3. Render will automatically detect the `render.yaml` file
4. Set up your environment variables in the Render dashboard
5. Deploy!

### Option 2: Manual Setup

1. Create a new Web Service in Render
2. Connect your Git repository
3. Configure the following settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add all environment variables listed above
5. Deploy

## Post-Deployment Configuration

### Update Google OAuth Redirect URIs

After deployment, update your Google OAuth configuration:

1. Go to Google Cloud Console
2. Add your Render URL to authorized redirect URIs:
   - `https://your-app-name.onrender.com/api/auth/callback/google`

### Update Supabase Configuration

1. Go to your Supabase project
2. Add your Render domain to allowed origins in Authentication settings

### Database Setup

Ensure your database schema is properly set up:

1. Run the SQL migrations in your Supabase SQL editor
2. Check that all tables are created correctly
3. Verify RLS (Row Level Security) policies are in place

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check for typos in variable names

3. **Database Connection**:
   - Verify Supabase URL and keys are correct
   - Check network connectivity

4. **Authentication Issues**:
   - Verify Google OAuth redirect URIs
   - Check NextAuth configuration

### Health Checks

The application includes a health check endpoint at `/`. If this fails:

1. Check application logs in Render dashboard
2. Verify all environment variables are set
3. Check database connectivity

## Monitoring

- Use Render's built-in logging to monitor your application
- Set up alerts for build failures and downtime
- Monitor database performance in Supabase dashboard

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to your repository
2. **Database Security**: Use RLS policies in Supabase
3. **Authentication**: Regularly rotate API keys and secrets
4. **HTTPS**: Render automatically provides SSL certificates

## Performance Optimization

1. **Caching**: Implement appropriate caching strategies
2. **Database**: Optimize queries and use indexes
3. **Images**: Use optimized image formats and sizes
4. **Bundle Size**: Monitor and optimize JavaScript bundle size

## Support

If you encounter issues:

1. Check Render's documentation
2. Review application logs
3. Verify all configuration steps
4. Test locally with production environment variables
