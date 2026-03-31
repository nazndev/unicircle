# AUDIT_AND_EXECUTION_PLAN

## Scope And Method

This audit covers the existing repository as-is, with focus on production readiness while preserving current architecture and product vision.

- Audited areas: `backend`, `mobile`, `admin`, `instructions`, CI workflows, Docker/EAS configs, Prisma schema.
- Method: file-level inventory + dependency mapping + risk review + phased execution plan.
- Constraint followed: no redesign, no speculative modules/endpoints, no refactor in this step.

---

## 1) Repository Inventory (Actual)

### Top-level

- `backend/`: NestJS API, Prisma schema, scripts, Dockerfile.
- `mobile/`: Expo React Native app with auth and main flows.
- `admin/`: Next.js admin portal.
- `instructions/`: product/architecture guidance (`00_feature_map.yml`, `01_backend_instructions.yml`, `02_mobile_app_instructions.yml`).
- `storage/`: file storage tree (avatars/documents/marketplace).
- Root ops/docs: `docker-compose.yml`, `README.md`, `SETUP.md`, `reset-all-data.sh`.
- CI workflows: `.github/workflows/backend-ci.yml`, `.github/workflows/backend-docker.yml`, `.github/workflows/mobile-build.yml`.

### Application packages

- `backend/package.json`: build, start, lint, jest, prisma scripts.
- `mobile/package.json`: Expo run/start scripts.
- `admin/package.json`: Next dev/build/start/lint scripts.

---

## 2) Backend Domain/Module Map

### Core bootstrap and cross-cutting

- App bootstrap/config: `backend/src/main.ts`
- Module wiring: `backend/src/app.module.ts`
- Prisma integration: `backend/src/prisma/*`
- Global guard: `MobileApiGuard` via `APP_GUARD` in `app.module.ts`
- Common decorators/guards/filters/interceptors in `backend/src/common/*`

### Domain modules under `backend/src/modules`

- Identity/Auth: `auth`, `users`, `university`, `organization`, `country`, `settings`, `badge`, `referral`
- Social: `crush`, `match`, `chat`, `groups`, `feed`, `reports`, `weekly-reveal`
- Opportunity/Career: `jobs`, `research`
- Marketplace/Commerce: `marketplace`, `vendor`, `orders`, `payments`, `payouts`, `billing`
- Platform/Ops: `admin`, `mail`, `upload`, `cache`, `alumni`

### Boundary observations

- Modular structure is good and should be preserved.
- Some services are broad and carry mixed concerns (notably auth/users/upload/admin).
- `MobileApiGuard` is global but conditionally enforces only `@MobileApi` endpoints; behavior is intentional but should be tightened.

---

## 3) Mobile Screen/Navigation/Store Map

### Entry and navigation

- App entry: `mobile/src/App.tsx`
- Auth stack: `mobile/src/navigation/AuthNavigator.tsx`
- Main tabs/stack: `mobile/src/navigation/MainNavigator.tsx`

### Auth screens (`mobile/src/screens/auth`)

- `WelcomeScreen`, `ChooseTypeScreen`, `EmailScreen`, `OtpVerifyScreen`
- `PersonalInfoScreen`, `ProfileSetupScreen`, `ProfessionalOnboardingScreen`
- `PasswordSetupScreen`, `PinLoginScreen`
- `TeacherRegisterScreen`, `AlumniRegisterScreen`, `PendingApprovalScreen`
- `RequestUniversityScreen`, `CountryInactiveScreen`

### Main screens (`mobile/src/screens/main`)

- `HomeScreen`, `CrushScreen`, `CirclesScreen`, `FeedScreen`, `MessagesScreen`
- `JobsScreen`, `ResearchScreen`, `MarketplaceScreen`, `ProfileScreen`
- `NameVerificationScreen`, `BadgeVerificationScreen`, `VendorOnboardingScreen`

### State/API/util

- Main auth/session store: `mobile/src/store/authStore.ts`
- API client/interceptors: `mobile/src/api/client.ts`
- Signature helper: `mobile/src/utils/signature.ts`
- Upload helper: `mobile/src/utils/imageUpload.ts`

### Mobile architecture observations

- Architecture choice (Expo + Zustand + React Navigation + SecureStore) is consistent and should remain.
- `authStore.ts` currently carries many responsibilities (bootstrap, OTP login, PIN login, feature loading, binding checks), making behavior hard to reason about.
- `App.tsx` navigator branching is functionally rich but complex and log-heavy.

---

## 4) Prisma Schema Domain Grouping (Source Of Truth)

Source: `backend/prisma/schema.prisma`

### Institutions and geography

- `Country`, `University`, `Organization`, `InstitutionRequest`

### Identity, auth, profile, device

- `User`, `EmailVerification`, `Device`, `AlumniApproval`, `TeacherApproval`, `UserBadge`

### Social graph and communication

- `Crush`, `Match`, `ChatMessage`, `Group`, `GroupMember`, `GroupMessage`

### Feed and moderation

- `Post`, `PostComment`, `PostLike`, `Report`, `AuditLog`

### Jobs and research

- `Job`, `JobApplication`, `ResearchOpportunity`, `ResearchApplication`

### Marketplace and vendor commerce

- `MarketplaceListing`, `Vendor`, `VendorLocation`, `VendorItem`

### Orders, payouts, billing

- `Order`, `OrderItem`, `Transaction`, `Payout`, `Invoice`, `Campaign`

### Platform settings/referrals

- `Settings`
- Referral fields on `User` (`referralCode`, `referredBy`, `referralPoints`)

### Schema observations

- Schema breadth is high; relation structure is generally coherent.
- Indexing exists in many critical paths.
- Domain density suggests eventual bounded-context split planning (documented in execution phases), but no immediate schema-breaking changes are recommended before hardening tests.

---

## 5) API/Client Dependency Map

## Backend API flow map (high level)

- Entry: `main.ts` (global prefix `/api`, validation pipe, helmet, CORS, exception filter/interceptor)
- Module composition: `app.module.ts`
- Auth/session endpoints in `auth.controller.ts`
- User profile and feature endpoints in `users.controller.ts`
- Upload endpoint/security in `upload.controller.ts` + `upload.service.ts`

## Mobile client dependency chain

- `App.tsx` -> `useAuthStore.checkAuth()` -> `apiClient` (`/me`, `/auth/check-password`, `/auth/check-device`)
- OTP login: `OtpVerifyScreen` -> `authStore.login()` -> `/auth/verify-code`
- PIN login: `PinLoginScreen` -> `authStore.passwordLogin()` -> `/auth/password-login`
- Token handling: `api/client.ts` request interceptor + response refresh path (`/auth/refresh`)
- API key/signature handling: `api/client.ts` + `utils/signature.ts`

## Admin dependency chain

- Admin auth state: `admin/src/store/authStore.ts`
- Axios client: `admin/src/lib/api.ts`
- UI route protection: `admin/src/components/ProtectedRoute.tsx`
- Backend admin surface: `backend/src/modules/admin/admin.controller.ts`

---

## 6) Current CI/CD Coverage

### Implemented

- Backend CI: install/build/prisma-validate/test-if-present (`.github/workflows/backend-ci.yml`)
- Backend Docker build/push: Docker Hub latest tag (`.github/workflows/backend-docker.yml`)
- Mobile EAS build workflow: Android + iOS production profiles (`.github/workflows/mobile-build.yml`)
- Docker compose local runtime: Postgres + API (`docker-compose.yml`)
- Mobile EAS config: `mobile/eas.json`

### Gaps

- No mandatory lint/test gates across all apps.
- Backend test step uses `--if-present`; practical safety reduced when test suite is empty.
- No deployment workflow to runtime environment in repo workflows.
- No migration deploy verification stage in CI.
- Mobile release workflow lacks explicit preflight checks (typecheck/lint/tests).

---

## 7) Security Risk Audit (Evidence-Based)

## Critical

- Sensitive values are tracked in backend env files (`backend/.env.local`, `backend/.env.prod`).
- Upload signed URL secret fallback to `'default-secret'` in `upload.service.ts` if `JWT_SECRET` missing.
- Mobile API guard logs received and expected API key values when mismatch occurs (`mobile-api.guard.ts`).

## High

- CORS fallback is wildcard with credentials enabled (`main.ts`).
- Admin token handling uses JS-accessible storage model (`localStorage` + cookie set in client code), increasing XSS impact (`admin/src/store/authStore.ts`, `admin/src/lib/api.ts`).
- Extensive auth debug logging in backend/mobile production paths (`auth.service.ts`, `auth.controller.ts`, `mobile/src/store/authStore.ts`, `mobile/src/App.tsx`).

## Medium

- Request signing path exists but is typically disabled via env and also implies secret distribution to mobile client (`mobile/src/api/client.ts`, guard env handling).
- Mixed storage exposure model: docs protected, avatars/marketplace public by rule. This is acceptable if intentional, but requires documented policy and tests.

---

## 8) Production-Readiness Gaps

- Minimal/no automated tests in backend/mobile/admin despite complex business logic.
- Runtime logging strategy is not production-safe yet (verbosity + potential sensitive context).
- Config normalization incomplete (localhost defaults, mixed app config paths, environment fallback behavior).
- Docker/backend build safety issue: Dockerfile uses `npm ci --omit=dev` before `npm run build` (Nest CLI is devDependency).
- Operational readiness docs exist but are not tightly mapped to executable checks.
- Health endpoint exists, readiness/dependency checks are basic.

---

## 9) MVP vs Non-MVP Feature Grouping (From Existing Code)

This grouping is inferred from implemented modules/screens and current depth, without inventing new scope.

### Likely MVP-core (already integrated end-to-end)

- Auth/onboarding foundations (OTP, PIN/password, user bootstrapping)
- Profile and verification basics
- Core social loop (`crush`, `match`, `chat`, `groups`, `feed`)
- Jobs baseline
- Marketplace baseline
- Admin moderation/control panel baseline

### Likely expansion / post-MVP complexity

- Full vendor commerce stack (`vendor`, `orders`, `payouts`, `billing`, `campaigns`)
- Research collaboration workflows
- Referral points ecosystem
- Advanced badge-space ecosystem
- Weekly reveal operational automation hardening

---

## 10) Top 15 Technical Debt Items

1. Secrets committed in tracked env files (`backend/.env.local`, `.env.prod`).
2. Insecure signing secret fallback (`upload.service.ts`).
3. API key mismatch logs expose expected secret context (`mobile-api.guard.ts`).
4. Overly permissive CORS default with credentials (`main.ts`).
5. Backend Docker build path likely fragile (`backend/Dockerfile`).
6. Sparse/no automated tests across all apps.
7. Auth flow spread across many mobile conditions (`App.tsx` + `authStore.ts`).
8. `authStore.ts` is oversized/multi-responsibility.
9. Request signing design ambiguity (client-held secret risk).
10. Production logging is inconsistent and too verbose across backend/mobile/admin.
11. Environment source-of-truth drift risk (mobile config paths and defaults).
12. CI does not enforce lint/typecheck/test uniformly.
13. No clear migration safety checks in CI/CD.
14. Schema/domain size suggests growing coupling (especially commerce/admin).
15. Upload/security policy is partly implicit; needs contract tests and documentation.

---

## 11) Prioritized Execution Plan (Phased, Incremental)

Each phase includes: why, files likely touched, risk addressed, and test strategy.

## Phase 1 - Audit Stabilization And Safety Baseline

Why:
- Reduce immediate operational/security risk before structural changes.

Scope:
- Document architecture/contracts/env/CI/security/test strategy.
- Remove unsafe/sensitive production-path logs.
- Normalize env variable references and defaults documentation.
- Confirm and document current auth/onboarding behavior end-to-end.

Files likely touched:
- `AUDIT_AND_EXECUTION_PLAN.md` (this file)
- `docs/DOMAIN_BOUNDARIES.md`
- `docs/API_CONTRACTS.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/CI_CD_HARDENING_PLAN.md`
- `docs/SECURITY_HARDENING_CHECKLIST.md`
- `docs/TEST_STRATEGY.md`
- selective code files for log hardening only (e.g., guard/auth/mobile app logs)

Risks addressed:
- Secret leakage in logs, unclear env usage, undocumented flow assumptions.

How to test:
- Manual auth flow smoke test (OTP, PIN setup/login, `/me` bootstrap).
- Verify no sensitive keys/tokens appear in logs.
- Validate app boots with documented envs.

## Phase 2 - Backend Hardening

Why:
- Improve reliability/security of existing NestJS modules without redesign.

Scope:
- Tighten DTO validation and error consistency.
- Clarify controller/service boundaries where blurry.
- Harden auth/session/device-binding behavior.
- Harden upload access/signing behavior and remove unsafe fallbacks.
- Improve config safety and startup validation.
- Add readiness checks if needed (without breaking existing health endpoint).

Files likely touched:
- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/modules/auth/*`
- `backend/src/modules/users/*`
- `backend/src/modules/upload/*`
- `backend/src/common/guards/mobile-api.guard.ts`
- `backend/src/common/*` (filters/interceptors as needed)

Risks addressed:
- Security defaults, auth regressions, inconsistent API behavior.

How to test:
- Unit tests for auth/upload guard paths.
- Manual endpoint verification via Swagger + scripted curl set.
- Regression checks for onboarding and `/me`/device binding paths.

## Phase 3 - Mobile Hardening

Why:
- Reduce auth/navigation complexity and production risk while preserving UX.

Scope:
- Split auth store responsibilities (bootstrap/login/PIN/device-binding/features).
- Standardize API error mapping and loading-state transitions.
- Simplify navigator branching logic and edge-case handling.
- Normalize runtime config usage from environment.
- Introduce release-safe logging strategy.

Files likely touched:
- `mobile/src/App.tsx`
- `mobile/src/store/authStore.ts` (and possible extracted stores/services)
- `mobile/src/api/client.ts`
- relevant auth screens under `mobile/src/screens/auth/*`
- config files (`mobile/app.config.js`, optionally `mobile/app.json` alignment)

Risks addressed:
- auth dead-ends, inconsistent session behavior, noisy production logs.

How to test:
- Manual matrix: first login, returning login, token expiry/refresh, PIN setup, country inactive, logout/login.
- TypeScript compile and Expo run smoke checks.

## Phase 4 - CI/CD And Release Hardening

Why:
- Enforce quality gates and safer release flows.

Scope:
- Add lint/typecheck/test/build gates across backend/mobile/admin.
- Add Prisma migration validation/deploy safety checks.
- Improve Docker build reliability.
- Clarify EAS profile usage and release procedure.
- Add release checklists for Android/iOS.

Files likely touched:
- `.github/workflows/*.yml`
- `backend/Dockerfile`
- package scripts in app `package.json` files
- docs under `docs/*` related to CI/CD

Risks addressed:
- broken releases, migration failures, inconsistent quality checks.

How to test:
- Run workflows on branch/PR.
- Local `npm run build`/lint/test parity for each package.
- Dry-run migration validation.

## Phase 5 - Security And Store Readiness

Why:
- Close compliance and security gaps prior to production rollout.

Scope:
- Verify permissions/token handling/privacy hooks.
- Validate CORS/helmet/throttling/storage access decisions.
- Ensure account deletion/policy/terms wiring and documentation traceability.
- Produce final release readiness checklist.

Files likely touched:
- backend security/config files and auth/upload modules
- mobile permission/config/auth files
- policy/compliance docs and checklist files

Risks addressed:
- store rejection, privacy/security incidents, non-compliant behavior.

How to test:
- Permission/path tests on iOS/Android.
- Security checklist run-through.
- Pre-release manual QA signoff checklist.

---

## 12) Recommended Immediate Next Action

Proceed with **Phase 1 documentation set** (no major refactor yet), then implement only low-risk stabilization items that are directly evidenced by this audit (secret-safe logging cleanup + unsafe fallback removal plan), each in small reviewable changes.

