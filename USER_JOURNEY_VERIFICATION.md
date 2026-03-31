# User Journey Verification & Professional Flow

## Overview

This document ensures the user journey follows the requirements:
1. Track users by their institute (university for students, organization for professionals)
2. Support student → professional transition with alumni status
3. Professionals can be alumni of one or multiple universities (with verification)
4. Device binding on registration/login
5. PIN login when PIN is set

## User Tracking by Institute

### Students
- **Tracked by**: `universityId` (required)
- **Registration**: Must use university email domain
- **Verification**: `universityEmailVerified = true` after OTP verification

### Professionals
- **Tracked by**: `organizationId` (required for professional mode)
- **Registration**: Must use organization email domain
- **Verification**: `officeEmailVerified = true` after OTP verification
- **Alumni Status**: Can be alumni of one or multiple universities
  - `universityId`: Primary university (if applicable)
  - `isAlumni`: Boolean flag
  - `alumniVerified`: Verification status (true if student→professional, or after admin approval)

## Student → Professional Transition

### Flow
1. **Student registers** with university email → `profileMode = 'student'`, `universityId` set
2. **Student transitions to professional**:
   - User provides organization email or selects organization
   - Backend sets:
     - `profileMode = 'professional'`
     - `organizationId` = selected organization
     - **PRESERVES** `universityId` (original university affiliation)
     - `isAlumni = true` (automatically)
     - `alumniVerified = true` (automatically, because they were already verified with university email)
   - User can now be tracked by both:
     - **Primary tracking**: `organizationId` (for professional features)
     - **Alumni tracking**: `universityId` (for alumni features)

### Backend Logic (users.service.ts)
```typescript
// If user was a student, automatically become alumni with verified badge
if (user.profileMode === 'student' && user.universityId) {
  updateData.isAlumni = true;
  updateData.alumniVerified = true; // Verified because they were already verified with university email
  // universityId is preserved (not cleared)
}
```

## Direct Professional Registration

### Flow
1. **User selects "I'm a Professional"** during onboarding
2. **User provides**:
   - Organization email (required)
   - University information (optional, for alumni status)
   - Documents (if claiming alumni status)
3. **Backend sets**:
   - `profileMode = 'professional'`
   - `organizationId` = organization from email domain
   - `universityId` = provided university (if any)
   - `isAlumni = true` (if university provided)
   - `alumniVerified = false` (requires admin approval with documents)
   - Creates `AlumniApproval` request for admin review

## Device Binding

### When Device is Bound
1. **On first login/registration** (OTP verification):
   - Device is bound immediately after successful OTP verification
   - This ensures device tracking from the start
   - Works even if PIN is not set yet

2. **After PIN setup**:
   - Device is bound again (or updated if already bound)
   - This ensures device is linked to user account

3. **On PIN login**:
   - Device binding is checked
   - If device is bound and PIN is set, show PIN login screen

### Implementation
- **Mobile**: `authStore.ts` - binds device after OTP login
- **Mobile**: `PasswordSetupScreen.tsx` - binds device after PIN setup
- **Backend**: `auth.service.ts` - `bindDevice()` method
- **Backend**: `auth.service.ts` - `checkDevice()` method

## PIN Login Flow

### Conditions for PIN Login
1. User has `passwordHash` set (PIN is configured)
2. User has device binding (`hasDeviceBinding = true`)
3. User's token is expired or missing
4. User doesn't need PIN setup (`needsPinSetup = false`)

### Flow
1. **App.tsx checks auth state**:
   ```typescript
   if (!isAuthenticated && hasDeviceBinding && !needsPinSetup) {
     // Show PIN login screen
     navigator = <AuthNavigator initialRouteName="PinLogin" />;
   }
   ```

2. **User enters email and PIN**
3. **Backend validates**:
   - Email exists
   - Password hash exists
   - Password matches
   - Account is verified
   - Country is active

4. **On success**:
   - Tokens are generated
   - User is authenticated
   - Device binding is confirmed
   - Navigate to main app

## Professional Alumni of Multiple Universities

### Current Implementation
- **Single university**: User has one `universityId`
- **Alumni status**: `isAlumni = true` indicates alumni status
- **Verification**: `alumniVerified = true` indicates verified alumni

### Future Enhancement (if needed)
To support multiple universities:
1. Create `UserAlumni` junction table:
   ```prisma
   model UserAlumni {
     id          String   @id @default(uuid())
     userId      String
     user        User     @relation(fields: [userId], references: [id])
     universityId String
     university  University @relation(fields: [universityId], references: [id])
     verified    Boolean  @default(false)
     documents   Json?
     verifiedAt  DateTime?
     createdAt   DateTime @default(now())
     
     @@unique([userId, universityId])
   }
   ```

2. Update logic to:
   - Allow multiple `UserAlumni` records
   - Track primary university in `universityId`
   - Check alumni status via `UserAlumni` records

### Current Workaround
- Professional can have one primary university (`universityId`)
- If they need to claim alumni status from another university, they can:
  1. Update their profile with new university
  2. Provide documents for verification
  3. Admin approves via `AlumniApproval`

## Verification Checklist

### Student Registration
- [x] User registers with university email
- [x] `universityId` is set
- [x] `universityEmailVerified = true` after OTP
- [x] `profileMode = 'student'`
- [x] Device is bound on first login

### Student → Professional Transition
- [x] `universityId` is preserved
- [x] `organizationId` is set
- [x] `isAlumni = true` (automatically)
- [x] `alumniVerified = true` (automatically)
- [x] `profileMode = 'professional'`

### Direct Professional Registration
- [x] User registers with organization email
- [x] `organizationId` is set
- [x] `officeEmailVerified = true` after OTP
- [x] `profileMode = 'professional'`
- [x] If university provided: `isAlumni = true`, `alumniVerified = false` (pending admin approval)
- [x] Device is bound on first login

### PIN Login
- [x] Device binding is checked
- [x] PIN login screen shown when appropriate
- [x] PIN validation works correctly
- [x] Navigation to main app after successful login

### Device Binding
- [x] Device bound on first login (OTP verification)
- [x] Device bound after PIN setup
- [x] Device binding checked on app start
- [x] PIN login shown when device is bound and PIN is set

## Testing Scenarios

### Scenario 1: Student Registration
1. User selects "I'm a Student"
2. Enters university email
3. Verifies OTP
4. **Expected**: `universityId` set, `profileMode = 'student'`, device bound

### Scenario 2: Student → Professional
1. Student logs in
2. Goes to Settings → Change Profile → Professional
3. Provides organization email or selects organization
4. **Expected**: `organizationId` set, `universityId` preserved, `isAlumni = true`, `alumniVerified = true`

### Scenario 3: Direct Professional Registration
1. User selects "I'm a Professional"
2. Enters organization email
3. Verifies OTP
4. Selects organization/university in onboarding
5. Provides documents (if claiming alumni)
6. **Expected**: `organizationId` set, `profileMode = 'professional'`, `isAlumni = true` (if university provided), `alumniVerified = false` (pending admin)

### Scenario 4: PIN Login
1. User has PIN set and device bound
2. Token expires
3. App restarts
4. **Expected**: PIN login screen shown, user can login with PIN

### Scenario 5: Device Binding
1. New user registers
2. Verifies OTP
3. **Expected**: Device is bound immediately
4. Sets PIN
5. **Expected**: Device binding is updated/confirmed

## Files Modified

### Mobile
- `mobile/src/store/authStore.ts` - Added device binding on OTP login
- `mobile/src/App.tsx` - PIN login navigation logic
- `mobile/src/screens/auth/PinLoginScreen.tsx` - PIN login UI
- `mobile/src/screens/auth/PasswordSetupScreen.tsx` - Device binding after PIN setup

### Backend
- `backend/src/modules/users/users.service.ts` - Student → Professional transition logic
- `backend/src/modules/auth/auth.service.ts` - Device binding methods
- `backend/src/modules/auth/auth.controller.ts` - Device binding endpoints

## Notes

1. **University ID Preservation**: When student transitions to professional, `universityId` is NEVER cleared. This ensures alumni tracking continues to work.

2. **Alumni Verification**: 
   - Student → Professional: `alumniVerified = true` (automatic, because they were already verified)
   - Direct Professional: `alumniVerified = false` (requires admin approval with documents)

3. **Device Binding**: Device is bound on first login to ensure tracking from the start, not just after PIN setup.

4. **PIN Login**: Only shown when:
   - User has password set
   - Device is bound
   - Token is expired/missing
   - User doesn't need PIN setup

