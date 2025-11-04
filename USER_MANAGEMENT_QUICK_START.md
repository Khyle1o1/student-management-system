# User Management Module - Quick Start Guide

Get started with the User Management Module in 5 minutes!

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Migration

**Option A: Using psql**
```bash
psql -U your_username -d your_database -f user_management_migration.sql
```

**Option B: Using Supabase Dashboard**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste contents of `user_management_migration.sql`
4. Click "Run"

### Step 2: Restart Your Application

```bash
npm run dev
```

### Step 3: Access User Management

1. Log in as an ADMIN user
2. Look for **"Users"** in the sidebar (below Settings)
3. Click to open User Management page

✅ **You're ready to go!**

## 📝 Common Tasks

### Create a College Organization User

1. **Dashboard → Users**
2. Click **"+ Add User"**
3. Fill in:
   ```
   Name: John Doe
   Email: johndoe@example.com
   Password: SecurePass123
   Role: College Organization
   Assigned College: College of Engineering
   ```
4. Click **"Create User"**

### Create a Course Organization User

1. **Dashboard → Users**
2. Click **"+ Add User"**
3. Fill in:
   ```
   Name: Jane Smith
   Email: janesmith@example.com
   Password: SecurePass456
   Role: Course Organization
   Assigned College: College of Engineering
   Assigned Course: Computer Science
   ```
4. Click **"Create User"**

### Archive a User

1. **Dashboard → Users**
2. Find the user in the table
3. Click the **Archive** button (📦)
4. Confirm

### Edit a User

1. **Dashboard → Users**
2. Find the user in the table
3. Click the **Edit** button (✏️)
4. Update fields
5. Click **"Save Changes"**

## 🔑 User Roles Explained

| Role | Who | Can Do |
|------|-----|--------|
| **ADMIN** | Supreme Student Council | Everything |
| **COLLEGE_ORG** | College Admins | Manage their college + create Course Orgs |
| **COURSE_ORG** | Course Admins | Manage their course |
| **USER** | Students | View own data |

## 🎯 Access Rules

### Who Can Create Users?

- **ADMIN**: Can create any role
- **COLLEGE_ORG**: Can create COURSE_ORG (under their college only)
- **COURSE_ORG**: Cannot create users
- **USER**: Cannot create users

### Who Can See What?

- **ADMIN**: All users
- **COLLEGE_ORG**: Course Orgs in their college
- **COURSE_ORG**: No user management access
- **USER**: No user management access

## 🛡️ Security Tips

1. **Use Strong Passwords**: Minimum 8 characters
2. **Set CRON_SECRET**: For production environments
3. **Review Regularly**: Check user list monthly
4. **Archive Promptly**: Archive users who leave

## ⚙️ Optional: Setup Automated Cleanup

Users archived for 2+ years will be auto-deleted.

**Quick Setup for Vercel:**
1. Deploy to Vercel
2. Done! (vercel-cron.json is already configured)

**For other platforms**: See [CRON_SETUP.md](./CRON_SETUP.md)

## 📊 Monitoring

### View Audit Log (Database)

```sql
SELECT * FROM user_audit_log
ORDER BY created_at DESC
LIMIT 20;
```

### Check User Status

```sql
SELECT name, email, role, status, assigned_college, assigned_course
FROM users
WHERE status = 'ACTIVE'
ORDER BY created_at DESC;
```

## ❓ Quick Troubleshooting

### "Permission denied"
→ Check if you're logged in as ADMIN or COLLEGE_ORG

### "Can't see Users menu"
→ Only ADMIN and COLLEGE_ORG can see this menu

### "Can't create user"
→ Check if you have permission to create that role

### "Email already exists"
→ Use a different email address

## 📚 Need More Details?

See [USER_MANAGEMENT_MODULE.md](./USER_MANAGEMENT_MODULE.md) for complete documentation.

## 🎉 You're All Set!

Start managing users and enjoy hierarchical access control!

---

**Next Steps:**
1. Create your first College Organization user
2. Have them create Course Organization users
3. Review the audit log to see tracked actions
4. Set up automated cleanup (optional)

