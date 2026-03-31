#!/bin/bash

# UniCircle - Complete Data Reset Script
# This script will:
# 1. Reset the database (drop all tables and reapply migrations)
# 2. Clear mobile app storage (instructions)
# 3. Clear temporary files
# 4. Regenerate Prisma client

set -e  # Exit on error

echo "⚠️  WARNING: This will DELETE ALL DATA from your database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo ""
echo "🔄 Starting data reset process..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Reset database
echo -e "${YELLOW}Step 1: Resetting database...${NC}"
cd backend

if [ -f ".env.local" ] || [ -f ".env" ]; then
  echo "✓ Found environment file"
else
  echo -e "${RED}✗ No .env or .env.local file found. Please create one with DATABASE_URL${NC}"
  exit 1
fi

# Reset Prisma database (drops all tables and reapplies migrations)
echo "Running: npx prisma migrate reset --force"
npx prisma migrate reset --force || {
  echo -e "${RED}✗ Database reset failed. Trying alternative method...${NC}"
  # Alternative: Drop and recreate
  echo "Attempting to drop and recreate database..."
  npx prisma db push --force-reset || {
    echo -e "${RED}✗ Database reset failed. Please check your DATABASE_URL and database connection.${NC}"
    exit 1
  }
}

echo -e "${GREEN}✓ Database reset complete${NC}"

# Step 2: Regenerate Prisma client
echo ""
echo -e "${YELLOW}Step 2: Regenerating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma client regenerated${NC}"

# Step 3: Populate countries (if script exists)
echo ""
echo -e "${YELLOW}Step 3: Populating countries...${NC}"
if [ -f "src/scripts/populate-countries.ts" ]; then
  npm run populate-countries || echo -e "${YELLOW}⚠ Could not populate countries (may need to run manually)${NC}"
  echo -e "${GREEN}✓ Countries populated${NC}"
else
  echo -e "${YELLOW}⚠ populate-countries script not found, skipping...${NC}"
fi

cd ..

# Step 4: Clear temporary files
echo ""
echo -e "${YELLOW}Step 4: Clearing temporary files...${NC}"

# Clear backend temp uploads
if [ -d "backend/temp-uploads" ]; then
  rm -rf backend/temp-uploads/*
  echo "✓ Cleared backend/temp-uploads"
fi

if [ -d "temp-uploads" ]; then
  rm -rf temp-uploads/*
  echo "✓ Cleared temp-uploads"
fi

# Clear build artifacts
if [ -d "backend/dist" ]; then
  rm -rf backend/dist
  echo "✓ Cleared backend/dist"
fi

if [ -d "mobile/.expo" ]; then
  rm -rf mobile/.expo
  echo "✓ Cleared mobile/.expo"
fi

if [ -d "admin/.next" ]; then
  rm -rf admin/.next
  echo "✓ Cleared admin/.next"
fi

echo -e "${GREEN}✓ Temporary files cleared${NC}"

# Step 5: Mobile app storage instructions
echo ""
echo -e "${YELLOW}Step 5: Mobile App Storage${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "To clear mobile app storage, you have two options:"
echo ""
echo "Option 1: Uninstall and reinstall the app (recommended)"
echo "  - This will clear all SecureStore data"
echo ""
echo "Option 2: Clear app data manually"
echo "  - iOS: Settings > General > iPhone Storage > UniCircle > Offload App"
echo "  - Android: Settings > Apps > UniCircle > Storage > Clear Data"
echo ""
echo "Option 3: Use Expo development tools"
echo "  - Run: npx expo start --clear"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Step 6: Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Data reset complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "1. Create a super admin: cd backend && npm run create-super-admin"
echo "2. Start backend: cd backend && npm run start:dev"
echo "3. Clear mobile app storage (see instructions above)"
echo "4. Start mobile app: cd mobile && npx expo start --clear"
echo ""
echo "Your database is now clean and ready for fresh data!"
echo ""

