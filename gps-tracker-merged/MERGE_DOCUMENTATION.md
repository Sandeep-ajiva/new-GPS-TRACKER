# GPS Tracker - Merged Client Project

## Overview
Successfully merged two separate Next.js frontend projects into a single unified application:
- **Admin Dashboard** (from `client`)
- **Manager Dashboard** (from `ajiva-tracker`)

## Project Structure

```
gps-tracker-merged/
├── app/
│   ├── page.tsx (Login page - Updated with API auth)
│   ├── layout.tsx (Root layout - Added Redux provider)
│   ├── admin/ (Admin dashboard routes)
│   │   ├── device-mapping/
│   │   ├── gps-devices/
│   │   ├── history/
│   │   ├── live-tracking/
│   │   ├── organizations/
│   │   ├── users/
│   │   ├── vehicles/
│   │   └── settings/
│   └── dashboard/ (Manager dashboard routes)
│       ├── alerts/
│       ├── app-config/
│       ├── fuel/
│       ├── geofences/
│       ├── licensing/
│       ├── reports/
│       ├── sys-config/
│       ├── temperature/
│       ├── tour/
│       ├── tracking/
│       └── users/
│
├── components/
│   ├── admin/ (Admin UI components)
│   ├── dashboard/ (Manager dashboard components)
│   ├── layout/ (Shared layout components)
│   ├── common/ (Common reusable components)
│   ├── auth/ (Authentication components)
│   └── ui/ (UI primitives)
│
├── redux/ (State management)
│   ├── api/
│   ├── features/
│   ├── hooks.ts
│   └── store.ts
│
├── lib/ (Utilities and hooks)
├── types/ (TypeScript types)
├── constants/ (App constants)
├── utils/ (Helper functions)
├── providers/ (React context providers)
├── public/ (Static assets)
│
├── package.json (Merged dependencies)
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
└── .env.example

```

## Key Features

### 1. **Unified Login System**
- **File**: `app/page.tsx`
- **Authentication**: API-based (connects to Node.js backend)
- **Role-Based Redirect**:
  - `admin` / `superadmin` → `/admin`
  - `manager` → `/dashboard`
  - `driver` → `/dashboard`
- **Storage**: JWT token + user role in localStorage

### 2. **Admin Dashboard** (`/admin`)
- GPS Device Management
- User Management
- Organization Management
- Vehicle Management
- Device-to-Vehicle Mapping
- GPS History Tracking
- Live Tracking
- Settings & Configuration

### 3. **Manager Dashboard** (`/dashboard`)
- Live Fleet Map
- Vehicle Status Cards
- Activity Stats
- Alerts Management
- Real-time Position Tracking
- Vehicle Details
- Health Metrics & Reports

### 4. **Authentication Protection**
- Dashboard pages check for valid JWT token
- Automatic redirect to login if not authenticated
- Role-based access control on both dashboards

## Merged Dependencies

Combined the best of both projects:
- **Admin Features**: Redux, Redux Toolkit, Prisma, NextAuth, Sonner
- **Manager Features**: Google Maps API, Leaflet Maps, Real-time capabilities
- **Common**: TailwindCSS, TypeScript, Next.js 16, React 19

### Key Dependencies:
```json
{
  "next": "16.1.3",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "@reduxjs/toolkit": "^2.11.2",
  "react-redux": "^9.2.0",
  "@react-google-maps/api": "^2.20.8",
  "leaflet": "^1.9.4",
  "recharts": "^3.6.0",
  "tailwindcss": "^4",
  "@prisma/client": "^5.10.2"
}
```

## Environment Setup

Create `.env.local`:
```bash
cp .env.example .env.local
```

Then add your API configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start

# Lint code
npm run lint
```

## Authentication Flow

1. User visits `/` (login page)
2. Enters email & password
3. Frontend sends credentials to `POST /api/users/login`
4. Backend validates and returns JWT token
5. Token stored in localStorage
6. User redirected based on role:
   - Admin/Superadmin → Admin Dashboard
   - Manager → Manager Dashboard
7. Each dashboard checks token on mount
8. Automatic redirect to login if token missing/invalid

## Changes Made to Original Files

### Login Page (`app/page.tsx`)
- ✅ Changed from hardcoded credentials to API authentication
- ✅ Updated to use email instead of username
- ✅ Added role-based redirection logic
- ✅ Enhanced UI with icons (Mail, Lock, Loader)
- ✅ Updated title and demo account info

### Root Layout (`app/layout.tsx`)
- ✅ Added Redux Provider wrapper
- ✅ Updated metadata
- ✅ Imported Redux configuration

### Dashboard Page (`app/dashboard/page.tsx`)
- ✅ Updated authentication check to use JWT token
- ✅ Removed hardcoded auth storage key
- ✅ Added role validation (manager, admin, superadmin)

### Package.json
- ✅ Merged all dependencies from both projects
- ✅ Prioritized newer versions when conflicts existed
- ✅ Updated project name to "gps-tracker"

## What To Do Next

1. **Install dependencies**:
   ```bash
   cd gps-tracker-merged
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL
   ```

3. **Test login**:
   - Start Node.js backend on port 5000
   - Run `npm run dev` in this folder
   - Visit `http://localhost:3000`
   - Log in with a test account from your backend

4. **Cleanup** (when servers are stopped):
   - Delete `client/` folder
   - Delete `ajiva-tracker/` folder
   - Keep only `gps-tracker-merged/` (rename to `gps-tracker`)

## Notes

- Both dashboards use similar styling (Tailwind + modern dark theme)
- Redux is available but manager dashboard uses local state (can be enhanced)
- All API calls go through the same backend
- Maps component (Leaflet & Google Maps) integrated in manager dashboard
- Admin dashboard has comprehensive admin features
- Both dashboards check authentication before rendering

