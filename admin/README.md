# UniCircle Admin Portal

Web-based backoffice for UniCircle operators, campus admins, and moderators.

## Features

- **Dashboard**: Platform metrics and KPIs
- **User Management**: View, filter, and block users
- **Alumni Approvals**: Review and approve/reject alumni verification requests
- **Universities**: Manage master data (universities, settings)
- **Content Moderation**: Moderate posts, marketplace listings, and reports
- **Settings**: Global configuration and audit logs

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Authentication

The admin portal uses JWT Bearer token authentication. Admin users must have one of the following roles:
- `super_admin`: Full access to all features
- `admin`: Access to most features (excludes settings)
- `moderator`: Content moderation only (reports, posts, marketplace)

## API Endpoints

The admin portal communicates with the backend API at `/api/admin/*` endpoints. All requests require:
- `Authorization: Bearer <token>` header
- Valid admin role in the JWT token

## Deployment

The admin portal can be deployed using:

1. **Docker**: Use the included `Dockerfile`
2. **DigitalOcean App Platform**: Deploy as a Next.js app
3. **Nginx**: Serve as a static site or reverse proxy

For production, update `NEXT_PUBLIC_API_BASE_URL` to your production API URL:
```env
NEXT_PUBLIC_API_BASE_URL=https://api.unicircle.pro/api
```

## Branding

- Primary Color: `#5C7AEA`
- Uses UniCircle branding throughout the interface
