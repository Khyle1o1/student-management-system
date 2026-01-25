# 🚀 Quick Start: Creating Staff Accounts

## Step-by-Step Guide

### 1️⃣ Run Database Migration (ONE TIME ONLY)

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project
2. Click on "SQL Editor" in the left menu
3. Create a new query
4. Copy the contents from `scripts/add-new-roles-migration.sql`
5. Paste and click "Run"

**Option B: Using psql**
```bash
psql -U your_username -d your_database -f scripts/add-new-roles-migration.sql
```

### 2️⃣ Create Events Staff Account

1. **Log in as Admin** to your system
2. Go to **Dashboard > Users**
3. Click **"Add New User"** button
4. Fill in the form:
   ```
   Name: Jane Smith
   Email: jane.smith@buksu.edu.ph
   Password: YourSecurePassword123
   Role: Events Staff
   ```
5. Click **"Create User"**
6. ✅ Done! Jane can now manage events, attendance, certificates, and evaluations

### 3️⃣ Create Intramurals Staff Account

1. Go to **Dashboard > Users**
2. Click **"Add New User"**
3. Fill in the form:
   ```
   Name: John Doe
   Email: john.doe@buksu.edu.ph
   Password: YourSecurePassword123
   Role: Intramurals Staff
   ```
4. Click **"Create User"**
5. ✅ Done! John can now manage intramurals only

---

## 🎯 What Each Role Can Do

### 👨‍💼 Admin (You)
- ✅ Everything (full system access)
- ✅ Create and manage users
- ✅ Access all pages

### 📅 Events Staff
- ✅ Create/Edit/Delete Events
- ✅ Manage Attendance (scan barcodes, view records)
- ✅ Manage Certificates
- ✅ Manage Evaluations
- ❌ No dashboard, no user management, no intramurals, no settings

### 🏆 Intramurals Staff
- ✅ Manage Intramurals ONLY
- ❌ No access to anything else

---

## 🔐 Security Features

✅ **Automatic Protection:**
- Navigation menu hides pages they can't access
- Direct URL access is blocked (redirects to 403 error)
- API calls are validated server-side
- Can't bypass restrictions through URL manipulation

---

## 🧪 Testing (Recommended)

### Test Events Staff:
1. Log out from admin account
2. Log in as Events Staff (jane.smith@buksu.edu.ph)
3. **Should See:** Events, Attendance, Certificates, Evaluations in menu
4. **Should NOT See:** Dashboard, Students, Fees, Users, Settings
5. Try typing `/dashboard/settings` in URL → Should redirect to 403 error ✅

### Test Intramurals Staff:
1. Log in as Intramurals Staff (john.doe@buksu.edu.ph)
2. **Should See:** Only Intramurals in menu
3. **Should NOT See:** Anything else
4. Try typing `/dashboard/events` in URL → Should redirect to 403 error ✅

---

## 📞 Troubleshooting

**Problem:** User can't log in
- ✅ **Solution:** Make sure email is correct and user status is "ACTIVE"

**Problem:** User sees "Forbidden" error
- ✅ **Solution:** Check that the user role matches their intended access level

**Problem:** Navigation menu is wrong
- ✅ **Solution:** Clear browser cache, log out, and log back in

---

## 📋 Reference

### Role Names in UI:
- `System Administrator (SSC)` → Full access admin
- `Events Staff` → Events/Attendance/Certificates/Evaluations
- `Intramurals Staff` → Intramurals only
- `College Organization` → College-level org account
- `Course Organization` → Course-level org account

---

## ✅ You're All Set!

**Implementation Complete** - Your role-based access control system is now active and protecting your application.

For detailed technical information, see:
- `RBAC-IMPLEMENTATION-GUIDE.md` - Full implementation guide
- `RBAC-IMPLEMENTATION-SUMMARY.md` - Technical summary

---

**Questions?** Check the troubleshooting section in `RBAC-IMPLEMENTATION-GUIDE.md`
