#!/usr/bin/env node

/**
 * Google OAuth Setup Validation Script
 * 
 * This script validates that all necessary components for Google OAuth
 * are properly configured in the Student Management System.
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 Google OAuth Setup Validation\n');

// Check 1: Environment Variables
console.log('1. Checking environment variables...');
try {
  require('dotenv').config();
  
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL'
  ];
  
  const missingVars = [];
  const presentVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      presentVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  });
  
  if (presentVars.length > 0) {
    console.log('   ✅ Present:', presentVars.join(', '));
  }
  
  if (missingVars.length > 0) {
    console.log('   ❌ Missing:', missingVars.join(', '));
    console.log('   📝 Create a .env file with the missing variables');
  } else {
    console.log('   ✅ All required environment variables are present');
  }
} catch (error) {
  console.log('   ❌ Could not load environment variables');
  console.log('   📝 Make sure you have a .env file in the project root');
}

console.log('');

// Check 2: Required Files
console.log('2. Checking required files...');
const requiredFiles = [
  'src/lib/auth.ts',
  'src/app/auth/login/page.tsx',
  'src/app/auth/error/page.tsx',
  'src/app/api/auth/[...nextauth]/route.ts',
  'src/types/next-auth.d.ts'
];

requiredFiles.forEach(filePath => {
  if (fs.existsSync(path.join(process.cwd(), filePath))) {
    console.log(`   ✅ ${filePath}`);
  } else {
    console.log(`   ❌ ${filePath}`);
  }
});

console.log('');

// Check 3: Domain Configuration
console.log('3. Checking domain configuration...');
try {
  const authContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/auth.ts'), 'utf8');
  
  if (authContent.includes('ALLOWED_STUDENT_DOMAIN')) {
    console.log('   ✅ Student domain validation is configured');
    
    // Extract the domain
    const domainMatch = authContent.match(/ALLOWED_STUDENT_DOMAIN\s*=\s*["']([^"']+)["']/);
    if (domainMatch) {
      const domain = domainMatch[1];
      if (domain === '@student.school.edu') {
        console.log(`   ⚠️  Using default domain: ${domain}`);
        console.log('   📝 Update ALLOWED_STUDENT_DOMAIN in src/lib/auth.ts to your institution\'s domain');
      } else {
        console.log(`   ✅ Custom domain configured: ${domain}`);
      }
    }
  } else {
    console.log('   ❌ Student domain validation not found');
  }
  
  if (authContent.includes('isValidStudentEmail')) {
    console.log('   ✅ Domain validation function is present');
  } else {
    console.log('   ❌ Domain validation function is missing');
  }
} catch (error) {
  console.log('   ❌ Could not read auth configuration file');
}

console.log('');

// Check 4: Package Dependencies
console.log('4. Checking package dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredPackages = {
    'next-auth': '^4.24.11',
    'next': '^14.0.0',
    '@prisma/client': '^6.0.0',
    'bcryptjs': '^3.0.0',
    'zod': '^3.0.0'
  };
  
  Object.entries(requiredPackages).forEach(([pkg, version]) => {
    if (deps[pkg]) {
      console.log(`   ✅ ${pkg}: ${deps[pkg]}`);
    } else {
      console.log(`   ❌ ${pkg}: not installed (required: ${version})`);
    }
  });
} catch (error) {
  console.log('   ❌ Could not read package.json');
}

console.log('');

// Check 5: Database Schema
console.log('5. Checking database schema...');
try {
  const schemaContent = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  
  if (schemaContent.includes('model User') && schemaContent.includes('model Student')) {
    console.log('   ✅ User and Student models are present');
  } else {
    console.log('   ❌ Required database models are missing');
  }
  
  if (schemaContent.includes('Role') && schemaContent.includes('STUDENT')) {
    console.log('   ✅ Role enum with STUDENT role is present');
  } else {
    console.log('   ❌ Role enum or STUDENT role is missing');
  }
} catch (error) {
  console.log('   ❌ Could not read prisma schema');
}

console.log('');

// Summary
console.log('📋 Next Steps:');
console.log('');
console.log('1. Set up Google Cloud Console:');
console.log('   - Go to https://console.cloud.google.com/');
console.log('   - Create OAuth 2.0 Client IDs');
console.log('   - Add redirect URI: http://localhost:3000/api/auth/callback/google');
console.log('');
console.log('2. Update environment variables:');
console.log('   - Add your Google Client ID and Secret to .env');
console.log('   - Set a secure NEXTAUTH_SECRET');
console.log('');
console.log('3. Configure student domain:');
console.log('   - Update ALLOWED_STUDENT_DOMAIN in src/lib/auth.ts');
console.log('   - Match your institution\'s email domain');
console.log('');
console.log('4. Create test student records:');
console.log('   - Users must exist in database before OAuth login');
console.log('   - Use the SQL examples in GOOGLE_OAUTH_SETUP.md');
console.log('');
console.log('5. Test the setup:');
console.log('   - Run: npm run dev');
console.log('   - Visit: http://localhost:3000/auth/login');
console.log('   - Try logging in with a test student account');
console.log('');
console.log('📖 For detailed instructions, see GOOGLE_OAUTH_SETUP.md'); 