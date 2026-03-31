# Jenkins setup for UniCircle

This document describes how to run the root `Jenkinsfile` for this repository. It matches the existing build model:

- **Backend**: `npm ci`, `npm run prisma:generate`, `npx prisma validate`, `npm run build`, `npm run test` (see `backend/package.json`).
- **Mobile**: `npm ci --legacy-peer-deps`, Expo/EAS preflight, `npx eas-cli build --platform android --profile production --non-interactive` (same EAS flow as `.github/workflows/mobile-build.yml`, without raw Gradle release builds).

Deployment, SSH, and Docker production deploy are **out of scope** for this pipeline version.

---

## Pipeline stages (why each exists)

| Stage | Purpose |
|--------|---------|
| **Checkout** | Ensures the workspace matches the configured SCM revision (`checkout scm`). |
| **Backend: install** | Installs locked dependencies with `npm ci` (same idea as GitHub Actions). |
| **Backend: Prisma generate** | Runs `npm run prisma:generate` (`prisma generate`) so the Nest app and tests see a generated Prisma Client. |
| **Backend: Prisma validate** | Runs `npx prisma validate` against `backend/prisma/schema.prisma` (aligned with `.github/workflows/backend-ci.yml`). |
| **Backend: build** | Runs `npm run build` (`nest build`). |
| **Backend: test** | Runs `npm run test` with Jest; `--passWithNoTests` avoids failure when no `*.spec.ts` files exist yet. |
| **Admin: install** | Installs admin dependencies with `npm ci` under `admin/`. |
| **Admin: lint** | Runs `npm run lint` for the Next.js admin app as an advisory check (non-blocking in this first Jenkins version due to existing baseline lint debt). |
| **Admin: build** | Runs `npm run build` for the Next.js admin app. |
| **Mobile: install** | Installs mobile dependencies with `npm ci --legacy-peer-deps` under `mobile/` (current lockfile/peer setup requires this in CI). |
| **Mobile: preflight** | Verifies Expo/EAS CLIs and TypeScript (`npx tsc --noEmit`). `expo-doctor` is run as an advisory health check and logged, but it does not block Android test builds in this first Jenkins version. |
| **Mobile: EAS Android (production)** | Cloud Android build via `npx eas-cli build --platform android --profile production --non-interactive` (see `mobile/eas.json`). Exports `EXPO_PUBLIC_*` for `app.config.js`. **No Gradle `assembleRelease`**. |
| **post / archiveArtifacts** | Saves EAS log and timestamp under `artifacts/` for the build record (binary stays on Expo unless you add a download step later). |

---

## Prerequisites

### Jenkins controller and agents

- **Node.js**: **20.x** on the agent (matches `.github/workflows/backend-ci.yml` and `mobile-build.yml`).
- **Java**: **17** for local Android/Gradle work. Newer JDKs such as 24 can break the Expo SDK 50 / Gradle 8.3 toolchain.
- **npm**: Bundled with Node.
- **Git**: For SCM checkout.
- **Network**: Agents need outbound HTTPS for `npm ci`, Prisma, Expo, and EAS cloud builds.

### Required Jenkins plugins

| Plugin | Purpose |
|--------|---------|
| **Pipeline** | Declarative `Jenkinsfile` support |
| **Git** | SCM checkout |
| **Credentials Binding** | `credentials()` in `environment { }` for Secret Text |
| **Workspace Cleanup** (optional) | Clean workspace between runs |
| **Timestamps** | Timestamps in console (often bundled; `options { timestamps() }` uses it) |

If you use **Multibranch Pipeline** or **GitHub Organization** jobs, ensure the appropriate plugins are installed.

**Not required** for this pipeline: Docker, Kubernetes, AnsiColor (not referenced in `Jenkinsfile`).

---

## Credentials (Secret Text)

Create **Secret text** credentials in Jenkins (**Manage Jenkins → Credentials**) with these **IDs** (they must match the `environment { }` block in `Jenkinsfile`, or change both places to match your naming):

| Jenkins credential ID | Purpose | Used by |
|----------------------|---------|---------|
| `unicircle-database-url` | PostgreSQL connection string | Backend tests / any runtime that reads `DATABASE_URL` |
| `unicircle-jwt-secret` | JWT signing secret | Backend tests / app config |
| `unicircle-cors-origin` | Allowed CORS origin(s) | Backend |
| `unicircle-expo-token` | Expo access token for non-interactive EAS | `eas build` (see [Expo CI](https://docs.expo.dev/build-reference/triggers-ci/)) |
| `unicircle-expo-public-api-base-url` | Public API base URL | Baked into app via `mobile/app.config.js` → `extra.apiBaseUrl` |
| `unicircle-expo-public-mobile-api-key` | Mobile API key (public client key) | `mobile/app.config.js` → `extra.mobileApiKey` |

**Important:**

- Do **not** hardcode these values in the `Jenkinsfile`.
- Do **not** print secret values in `sh` scripts (use `set +x` only if you add custom debug; avoid `echo` of env vars).
- Jenkins masks values injected via `credentials()` when the credential is bound to the build environment.

### Expo token (`EXPO_TOKEN`)

EAS expects a valid **Expo access token** in the environment for CI-style runs. Create a token from your Expo account and store it as `unicircle-expo-token` (Secret text). The pipeline relies on the environment variable `EXPO_TOKEN` being set automatically from that credential (Expo CLI reads `EXPO_TOKEN`).

---

## Environment variables (summary)

| Variable | Source in Jenkins | Notes |
|----------|-------------------|--------|
| `DATABASE_URL` | Credential `unicircle-database-url` | Required for realistic backend tests if code touches DB |
| `JWT_SECRET` | Credential `unicircle-jwt-secret` | Backend |
| `CORS_ORIGIN` | Credential `unicircle-cors-origin` | Backend |
| `EXPO_TOKEN` | Credential `unicircle-expo-token` | EAS (name must match Expo’s expectation; credential value is the token) |
| `EXPO_PUBLIC_API_BASE_URL` | Credential `unicircle-expo-public-api-base-url` | Passed into `mobile` build so `app.config.js` can read `process.env.EXPO_PUBLIC_*` |
| `EXPO_PUBLIC_MOBILE_API_KEY` | Credential `unicircle-expo-public-mobile-api-key` | Same as above |

**Additional variables** (optional, not wired in the default `Jenkinsfile`):

- If you later need `MOBILE_API_SECRET`, Redis, or SMTP for integration tests, add credentials and export them only in the stages that need them.
- `mobile/app.config.js` also supports `EXPO_PUBLIC_MOBILE_API_KEY` only for `mobileApiKey`; request signing secrets are documented in code comments and are **not** required for a minimal EAS build unless you enable signing.

---

## Creating the pipeline job

1. In Jenkins: **New Item** → name the job → **Pipeline** → OK.  
   (Alternatively use **Multibranch Pipeline** if you want branch discovery.)
2. Under **Pipeline**:
   - **Definition**: **Pipeline script from SCM**.
   - **SCM**: **Git**.
   - **Repository URL**: your clone URL (e.g. `https://github.com/nazndev/unicircle.git`).
   - **Credentials**: add if the repo is private.
   - **Branch specifier**: `*/main` (or your default branch).
   - **Script Path**: `Jenkinsfile` (repository root).
3. Save the job.
4. Create the six **Secret text** credentials in Jenkins with the exact IDs in the table above (or edit the `Jenkinsfile` `environment { }` block and this doc to use your own IDs consistently).

---

## How to run

1. **Manual**: Open the job → **Build Now**. The workspace is checked out and stages run in order.
2. **SCM polling**: In the job config, enable **Poll SCM** with a schedule if you do not use webhooks.
3. **GitHub/Git webhook**: Point your host’s webhook to Jenkins (or use the **GitHub** / **Generic Webhook** plugin) so pushes trigger builds—configure as usual for your controller.

**First-time checklist**

- [ ] Agent has **Node.js 20** and **npm** on `PATH`.
- [ ] All six credentials exist and IDs match `Jenkinsfile`.
- [ ] Expo account has access to the project/slug in `mobile/app.config.js` (`slug: "unicircle"`) and `EXPO_TOKEN` is valid.

### Expected outputs

- **Console log**: Timestamped stages; backend install → Prisma generate → validate → build → test → mobile install → preflight → EAS Android build.
- **Archived artifacts** (if stages complete):
  - `artifacts/eas-android-build.log` — full EAS CLI output for the Android production build.
  - `artifacts/build-timestamp.txt` — UTC time when the EAS stage finished writing the log.

**Note:** EAS **cloud** builds produce the APK/AAB on Expo’s servers. This pipeline does **not** download the binary artifact unless you add a follow-up step (e.g. `eas build:download` or Expo web dashboard). The log file is the primary local artifact.

---

## Alignment with the repo

| Step | Repo source |
|------|-------------|
| Backend install | `backend/package.json` → `npm ci` |
| Prisma generate | `npm run prisma:generate` |
| Prisma validate | `npx prisma validate` (same as `.github/workflows/backend-ci.yml`) |
| Backend build | `npm run build` |
| Backend test | `npm run test` with `--passWithNoTests` so empty test suites do not fail CI |
| Admin install | `admin/package.json` → `npm ci` |
| Admin lint | `npm run lint` |
| Admin build | `npm run build` |
| Mobile install | `mobile/package.json` deps with `npm ci --legacy-peer-deps` |
| Preflight | `npx expo --version`, `npx eas-cli --version`, `npx tsc --noEmit`, `npx expo-doctor` (non-blocking) |
| Android build | `mobile/eas.json` profile `production` (Android `buildType: apk`), `npx eas-cli build --platform android --profile production --non-interactive` |

**Not included** in this `Jenkinsfile`:

- **Admin** (`admin/`): no `npm run build` for `admin` yet—add a stage when you want Jenkins to validate the Next.js app.
- **iOS EAS build**: omitted in v1 (GitHub `mobile-build.yml` builds both platforms; this pipeline is Android-only for a smaller first step).
- **Deployment**: no SSH, no Docker stack deploy.

---

## Current limitations

1. **Credential IDs are fixed** in the `Jenkinsfile` (`unicircle-*`). Rename in Jenkins and in the file if you use a different convention.
2. **`expo-doctor`** is non-blocking in this pipeline version. It still reports config/dependency issues in logs, but Jenkins continues to the Android EAS build so test artifacts are not blocked by known Expo warnings.
3. **EAS project configuration**: if the Android build fails with `EAS project not configured`, run `eas init` once locally for this project (with your Expo account and `slug`), and push any necessary config changes before re-running Jenkins.
4. **Android build image**: `mobile/eas.json` pins the production Android profile to `sdk-50` so EAS uses the matching Java 17 / NDK toolchain for this Expo SDK 50 project.
5. **Admin lint** is non-blocking in this pipeline version. This is intentional while existing admin lint violations are being remediated incrementally.
6. **No EAS artifact download** — only logs are archived locally.
7. **Node version** is not enforced inside the `Jenkinsfile` (no `nvm`/`fnm` block); use a Node 20 agent label or tool installer.
8. **Backend tests** use `--passWithNoTests` because the repo may not yet contain `*.spec.ts` files; when tests exist, they will run normally.

---

## Future improvements

- Add **admin** stage: `cd admin && npm ci && npm run lint && npm run build`.
- Add **iOS** EAS stage: `npx eas-cli build --platform ios --profile production --non-interactive` (requires Apple credentials / Expo credentials).
- Add **optional** `eas build:download` or API polling to archive **APK/AAB** to Jenkins.
- Pin **Node** via Jenkins `tools { nodejs 'node20' }` or a Docker agent `node:20`.
- Run **parallel** backend and mobile on separate agents if queue time is an issue.
- Add **PR** triggers and status checks mirroring GitHub Actions.

---

## Local verification (manual)

These do not replace Jenkins but help validate the same commands:

```bash
# Backend
cd backend && npm ci && npm run prisma:generate && npx prisma validate && npm run build && npm run test -- --passWithNoTests

# Mobile (EAS needs EXPO_TOKEN and project login)
cd mobile && npm ci --legacy-peer-deps && npx tsc --noEmit && npx expo-doctor
cd mobile && npx eas-cli build --platform android --profile production --non-interactive
```

Set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_MOBILE_API_KEY` in the shell before EAS build to mirror Jenkins.
