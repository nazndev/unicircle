# UniCircle Setup Guide

## ✅ Completed Setup

The UniCircle platform has been fully scaffolded with:

### Backend (NestJS + Prisma + PostgreSQL)
- ✅ Complete Prisma schema with all models
- ✅ Auth module (OTP, alumni registration, JWT)
- ✅ User module with profile mode transitions
- ✅ Crush & Match modules
- ✅ Chat, Groups, and Feed modules
- ✅ Jobs and Marketplace modules
- ✅ Admin, Payments, and Weekly Reveal modules
- ✅ Mail service (Gmail for dev, Brevo for prod)
- ✅ Docker configuration
- ✅ GitHub Actions CI/CD workflows

### Mobile App (React Native + Expo)
- ✅ Expo project setup
- ✅ Navigation structure (Auth + Main)
- ✅ Authentication screens
- ✅ Main feature screens (Crush, Circles, Feed, Jobs, Marketplace, Messages, Profile)
- ✅ State management with Zustand
- ✅ API client with token management

## 🚀 Quick Start

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment:**
   - Copy `.env.local` and update with your Gmail SMTP credentials
   - For production, use `.env.prod` with Brevo SMTP

3. **Set up database:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Run locally:**
   ```bash
   npm run start:dev
   ```

5. **Or use Docker:**
   ```bash
   cd ..
   docker-compose up --build
   ```

### Mobile App Setup

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Update API URL:**
   - Edit `app.json` → `extra.apiBaseUrl` to point to your backend

3. **Run:**
   ```bash
   npm start
   ```

## 📋 Next Steps

1. **Configure SMTP:**
   - Update `.env.local` with Gmail App Password
   - Update `.env.prod` with Brevo credentials

2. **Seed initial data:**
   - Create universities in the database
   - Set up admin users

3. **Test the API:**
   - Visit `http://localhost:3000/api/docs` for Swagger UI
   - Test health endpoint: `http://localhost:3000/healthz`

4. **Build mobile app:**
   - Configure EAS: `npx eas build:configure`
   - Build for production: `npx eas build --platform android`

## 🔐 Security Checklist

- [ ] Update JWT secrets in production
- [ ] Configure CORS origins
- [ ] Set up HTTPS with Certbot
- [ ] Configure rate limiting
- [ ] Set up monitoring (UptimeRobot, Healthchecks.io)
- [ ] Enable database backups

## 📱 Store Compliance

- [ ] Create Privacy Policy page
- [ ] Create Terms of Service page
- [ ] Create Community Guidelines page
- [ ] Configure App Store metadata
- [ ] Set up in-app account deletion
- [ ] Test alumni verification flow

## 🌐 Deployment

1. **DigitalOcean Setup:**
   - Create droplet
   - Install Docker and Docker Compose
   - Set up Nginx reverse proxy
   - Configure SSL with Certbot

2. **CI/CD:**
   - Add GitHub secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN, etc.)
   - Push to `main` branch to trigger deployment

3. **Database:**
   - Run migrations: `npx prisma migrate deploy`
   - Set up daily backups

## 📚 API Documentation

Once running, visit:
- Swagger UI: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/healthz`

## 🐛 Troubleshooting

- **Database connection issues:** Check DATABASE_URL in .env
- **SMTP errors:** Verify SMTP credentials
- **Mobile app can't connect:** Check API_BASE_URL in app.json
- **Prisma errors:** Run `npx prisma generate` after schema changes

---

**Status:** ✅ Backend and Mobile app scaffolded and ready for development!

