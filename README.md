# 🟣 UniCircle — Full-Stack Production Guide

## Overview
**UniCircle** is a next-generation campus network that evolves with its users — starting as a student social app and transitioning into a verified alumni and professional ecosystem. It integrates social discovery (crushes, circles, feed), job networking, and a marketplace for campus housing and resale.

The platform is designed to meet **Google Play** and **App Store** compliance, with a fully containerized backend, continuous integration, and secure data handling.

---

## 🧩 Architecture Summary

| Layer | Technology | Description |
|-------|-------------|-------------|
| Frontend | React Native (Expo, TypeScript) | Cross-platform mobile app (Android + iOS) |
| Backend | Node.js (NestJS + Prisma + PostgreSQL) | Secure REST API and business logic |
| Database | PostgreSQL 16 | Hosted via Docker on DigitalOcean |
| Auth | OTP-based (student email) + Alumni verification | Multi-step onboarding |
| CI/CD | GitHub Actions + Docker + EAS | Continuous build and deploy pipelines |
| Hosting | DigitalOcean Droplet or App Platform | Managed with Nginx reverse proxy and HTTPS |
| Monitoring | Healthchecks.io, UptimeRobot, Trivy | Backup, metrics, and vulnerability tracking |

---

## 📂 Folder Structure

```
unicircle/
│
├── instructions/
│   ├── 00_feature_map.yml
│   ├── 01_backend_instructions.yml
│   ├── 02_mobile_app_instructions.yml
│   ├── 03_deployment_ci_cd_instructions.yml
│   └── 04_store_and_security_overrides.yml
│
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── .env
│
├── mobile/
│   ├── src/
│   ├── app.json
│   └── eas.json
│
└── README.md
```

---

## ⚙️ 00_feature_map.yml — Core Features

Defines **system modules and business logic**:
- Student onboarding via university email OTP  
- Alumni onboarding via document upload and 24h approval  
- Profile transitions: student → alumni → professional  
- Cross-campus crush matching  
- Circles for courses, programmes, alumni, and interests  
- Feed and comments with moderation  
- Marketplace for accommodation and resale  
- Monetization via promoted posts, job boosts, and subscriptions  

---

## 🧠 01_backend_instructions.yml — Backend API Design

**Stack:** NestJS + Prisma + PostgreSQL

**Key domains:**
- `auth` — email OTP & alumni verification  
- `user` — profile modes, alumni proof, professional info  
- `crush` — match logic + notification  
- `circle` — dynamic groups by programme/university  
- `feed` — user posts, comments, and reports  
- `job` — student and alumni job listings  
- `marketplace` — buy/sell/rent modules with moderation  
- `transaction` — premium and revenue tracking  

**Security & integrations:**
- JWT authentication  
- Prisma migrations auto-deployed  
- SMTP via Brevo or SendGrid  
- File upload isolation in `/uploads/alumni/`  
- Rate limiting, CORS, and audit logging  

---

## 📱 02_mobile_app_instructions.yml — Mobile Application

**Framework:** React Native + Expo (TypeScript)

**Features:**
- Student + Alumni onboarding flows  
- Profile mode switching  
- Campus + cross-campus crush  
- Circles and alumni groups  
- Feed and comments  
- Jobs (apply + post for verified users)  
- Marketplace (accommodation, used items)  
- Notifications and reporting  

**Architecture:**
- State managed with Zustand  
- Navigation via React Navigation  
- SecureStore for tokens  
- EAS builds for Android & iOS  

**Compliance:**
- ATS/HTTPS enforced  
- Marketplace read-only for unverified users  
- Pending verification screens integrated  

---

## 🚀 03_deployment_ci_cd_instructions.yml — CI/CD Pipeline

**Hosting:** DigitalOcean (Dockerized backend + PostgreSQL)

**CI/CD Flow:**
1. **Backend CI**
   - Lint, build, and test via GitHub Actions  
   - Prisma schema validation  
2. **Docker Build**
   - Automated build & push to Docker Hub  
3. **DigitalOcean Deployment**
   - App Platform or droplet with Nginx + Certbot  
   - Optional DO Spaces for uploads  
4. **Database**
   - Automated migrations on deploy  
   - Daily backup rotation  
5. **Mobile CI**
   - Expo EAS workflow for production builds  
   - Auto version bump  
6. **Security**
   - HTTPS enforced  
   - JWT rotation, Trivy scan, fail2ban  

---

## 🔐 04_store_and_security_overrides.yml — Store Compliance

**Purpose:** Ensure Play Store and App Store acceptance

**Includes:**
- Privacy Policy, Terms, and Guidelines pages  
- Alumni verification disclosure (24h manual review)  
- Marketplace data safety (UGC, deletion rights)  
- Payment and revenue compliance (third-party processors only)  
- In-app account deletion (self-service)  
- Profile mode disclosure (student, alumni, professional)  
- HTTPS and proxy hardening (Nginx + Certbot)  
- Moderation policies and reporting workflows  
- Strict security headers and monitoring alerts  

---

## 💰 Revenue Model

| Stream | Description |
|---------|-------------|
| Featured Listings | Marketplace post promotions |
| Job Boosts | Employers pay for highlighted jobs |
| Premium Accounts | Unlock unlimited crushes & analytics |
| Transaction Fee | Commission on peer sales |
| White-label | Custom university-branded deployments |

---

## 🧾 Store Metadata Checklist

| Field | Description |
|--------|-------------|
| App Name | **UniCircle – Campus & Alumni Network** |
| Category | Social Networking / Education |
| Description | Connect with your campus, alumni, and opportunities in one verified network. |
| Data Safety | Compliant with Play Store Data Safety + Apple App Privacy. |
| Support Email | support@unicircle.app |
| Website | https://unicircle.app |
| Deletion Policy | In-app deletion enabled under Settings → Delete Account. |

---

## 📈 Monitoring & Scalability

- Database: `pg_dump` daily backup rotation  
- Alerts: Alumni verification anomalies, failed payments  
- Logging: Centralized audit via Winston or Pino  
- Scaling: Multi-container Docker setup (api + db + nginx + worker)  
- Optional: CDN via Cloudflare or DO Spaces  

---

## 🧩 Next Steps

1. **Initialize backend repo:**  
   ```bash
   npx nest new backend && cd backend
   npm install @prisma/client prisma
   npx prisma init
   ```

2. **Initialize mobile repo:**  
   ```bash
   npx create-expo-app mobile
   cd mobile && npm install axios zustand react-navigation
   ```

3. **Run Docker locally:**  
   ```bash
   docker-compose up --build
   ```

4. **Configure CI secrets:**
   - `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
   - `DIGITALOCEAN_ACCESS_TOKEN`
   - `EXPO_USERNAME`, `EXPO_PASSWORD`
   - `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`

5. **Deploy via GitHub Action**  
   Push to `main` → auto-build + deploy.

---

## 📘 Author Notes
**Designed by:** Nazmul Nazim  
**Architecture by:** Nazmul Nazim
**Deployment Target:** DigitalOcean production-grade droplet  
**License:** Proprietary (non-commercial prototype unless relicensed)
