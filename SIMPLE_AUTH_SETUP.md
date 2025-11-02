# Simple Account Management

You now have a simple way to create and manage user accounts!

## How to Create Accounts

### As a Platform Owner (Super Admin):

1. Go to `/owner/users` in your app
2. Click **"Add User"** button
3. Fill in the form:
   - **Email** - User's email address
   - **Name** - User's full name
   - **Password** - Set a secure password (automatically hashed)
   - **Phone** (Optional) - User's phone number
   - **Account Type** - Choose from:
     - Admin (Organization Admin)
     - Staff (Teacher/Staff)
     - Parent
   - **Organization** - Select which organization this user belongs to (only if not Super Admin)
   - **Make Platform Owner** - Check to make user a Super Admin (can access owner portal)

4. Click **"Create User"**

That's it! The user can now sign in with their email and password.

## Features

✅ **Simple UI** - Clean form interface  
✅ **Automatic Password Hashing** - Passwords are securely hashed with bcrypt  
✅ **Organization Assignment** - Automatically creates organization membership  
✅ **Role Management** - Set user roles (Admin, Staff, Parent) easily  
✅ **Super Admin Creation** - Create platform owners with one click  

## API Endpoint

If you prefer programmatic access:

```bash
POST /api/users/create
Authorization: (Must be logged in as Super Admin)

Body:
{
  "email": "user@example.com",
  "name": "User Name",
  "password": "securePassword123",
  "phone": "+44 7700 900000",
  "isSuperAdmin": false,
  "orgId": "org-id-here",
  "role": "ADMIN"
}
```

## Current Setup

- **Authentication**: NextAuth.js (kept for compatibility)
- **Database**: Neon Postgres (or your configured database)
- **Password Storage**: Bcrypt hashed passwords
- **User Model**: Custom Prisma model with `password` field

## Quick Start

1. Sign in as a Platform Owner (Super Admin)
2. Navigate to `/owner/users/create`
3. Fill in the form and create your first admin account
4. The new user can immediately sign in at `/auth/signin`

No complex setup, no manual database operations - just create accounts through the UI!

