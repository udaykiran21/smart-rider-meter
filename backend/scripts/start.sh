#!/bin/sh
set -e

echo "Waiting for PostgreSQL at db:5432..."
until pg_isready -h db -p 5432 -U postgres; do
  sleep 2
done

echo "Database is ready. Running migrations..."
npx prisma migrate deploy

echo "Starting backend..."
node dist/server.js
