# Admin Setup Guide

## Super Admin Authentication

The UniCircle backend uses role-based access control (RBAC) for admin operations.

## User Roles

- **`user`** (default) - Regular platform user
- **`admin`** - Standard admin access to admin endpoints
- **`super_admin`** - Full system access

## Creating a Super Admin

### Method 1: Using the Script (Recommended)

```bash
cd backend
npm run create-super-admin
```

This will create a super admin with default credentials:
- Email: `admin@unicircle.app`
- Password: `admin123`

### Method 2: Custom Credentials

Set environment variables before running:

```bash
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your-secure-password
SUPER_ADMIN_NAME="Admin Name"
npm run create-super-admin
```

### Method 3: Manual Database Update

```sql
-- Create or update user
INSERT INTO "User" (id, email, name, "passwordHash", role, "isVerified", "verificationStatus", "profileMode", "createdAt")
VALUES (
  gen_random_uuid(),
  'admin@unicircle.app',
  'Super Admin',
  '$2b$10$...', -- bcrypt hash of password
  'super_admin',
  true,
  'approved',
  'professional',
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET role = 'super_admin',
    "passwordHash" = EXCLUDED."passwordHash";
```

## Admin Login Endpoint

**POST** `/api/auth/admin/login`

Request body:
```json
{
  "email": "admin@unicircle.app",
  "password": "admin123"
}
```

Response:
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-id",
    "email": "admin@unicircle.app",
    "name": "Super Admin",
    "role": "super_admin"
  }
}
```

## Admin Guards

### AdminGuard
Protects endpoints that require `admin` or `super_admin` role.

Usage:
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
```

### SuperAdminGuard
Protects endpoints that require `super_admin` role only.

Usage:
```typescript
@UseGuards(JwtAuthGuard, SuperAdminGuard)
```

## Protected Admin Endpoints

All endpoints under `/api/admin/*` are protected by:
- `JwtAuthGuard` - Validates JWT token
- `AdminGuard` - Checks for admin/super_admin role

Example:
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  // All endpoints require admin role
}
```

## Security Best Practices

1. **Change Default Password**
   - Immediately change the default super admin password
   - Use a strong, unique password

2. **Limit Admin Accounts**
   - Only create admin accounts for trusted personnel
   - Regularly audit admin user list

3. **Use Environment Variables**
   - Never hardcode admin credentials
   - Use secure password generation

4. **Enable HTTPS**
   - Always use HTTPS in production
   - Protect JWT tokens in transit

5. **Monitor Admin Activity**
   - Log all admin actions
   - Set up alerts for suspicious activity

6. **Regular Audits**
   - Review admin user list periodically
   - Remove unused admin accounts
   - Rotate passwords regularly

## Creating Additional Admins

### Via Database Query

```sql
-- Update existing user to admin
UPDATE "User" 
SET role = 'admin' 
WHERE email = 'user@example.com';

-- Set password hash (generate with bcrypt)
UPDATE "User" 
SET "passwordHash" = '$2b$10$...' 
WHERE email = 'user@example.com';
```

### Via Prisma Studio

1. Run `npm run prisma:studio`
2. Find the user
3. Update `role` to `admin` or `super_admin`
4. Set `passwordHash` (use bcrypt to hash password)

## Password Hashing

Admin passwords are hashed using bcrypt. To generate a hash:

```typescript
import * as bcrypt from 'bcrypt';

const password = 'your-password';
const hash = await bcrypt.hash(password, 10);
console.log(hash);
```

## Troubleshooting

### "Access denied. Admin privileges required."
- User doesn't have `admin` or `super_admin` role
- Check user role in database

### "Admin account not properly configured"
- User doesn't have a `passwordHash`
- Set password hash for admin account

### "Invalid credentials"
- Wrong email or password
- Verify credentials match database

### "Account is blocked"
- Admin account is blocked
- Set `isBlocked = false` in database

---

**Note:** Always use strong passwords and keep admin credentials secure!

