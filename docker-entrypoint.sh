#!/bin/sh
set -e

echo "Running Prisma DB push to sync schema..."
npx prisma db push --accept-data-loss

echo "Starting Next.js app..."
exec npm start
