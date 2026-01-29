#!/bin/bash

set -e

REPO_DIR="../kupito.club"
WORKFLOW_FILE=".github/workflows/ci.yml"
TEMP_FILE=$(mktemp)

echo "🔄 Updating kupito.club workflow..."

if [ ! -d "$REPO_DIR" ]; then
  echo "❌ Repository kupito.club not found at $REPO_DIR"
  echo "📋 Cloning repository..."
  
  if [ -z "$PAT_TOKEN" ]; then
    echo "⚠️  PAT_TOKEN environment variable not set"
    echo "Please set PAT_TOKEN environment variable or clone manually:"
    echo "  git clone https://github.com/Hexj13/kupito.club.git $REPO_DIR"
    exit 1
  fi
  
  git clone "https://x-access-token:${PAT_TOKEN}@github.com/Hexj13/kupito.club.git" "$REPO_DIR"
fi

cd "$REPO_DIR"

if [ ! -f "$WORKFLOW_FILE" ]; then
  echo "❌ Workflow file not found at $WORKFLOW_FILE"
  echo "📝 Creating workflow file..."
  mkdir -p .github/workflows
fi

cat > "$TEMP_FILE" << 'WORKFLOW_EOF'
name: CI/CD

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build and Deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
          token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Copy locale files to core
        run: |
          cp -r locales core/frontend/lib/
          cp -r theme core/frontend/lib/
          cp -r config core/frontend/lib/

      - name: Install frontend dependencies
        working-directory: ./core/frontend
        run: npm ci

      - name: Install backend dependencies
        working-directory: ./core/backend
        run: npm ci

      - name: Build frontend
        working-directory: ./core/frontend
        env:
          NEXT_PUBLIC_COUNTRY: md
          NEXT_PUBLIC_SITE_URL: https://kupito.club
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
        run: npm run build

      - name: Build backend
        working-directory: ./core/backend
        run: npm run build

      - name: Deploy
        # Add your deployment steps here
        run: |
          echo "Deploy to production..."
          # Your deployment commands
WORKFLOW_EOF

if ! diff -q "$TEMP_FILE" "$WORKFLOW_FILE" > /dev/null 2>&1; then
  echo "📝 Updating workflow file..."
  cp "$TEMP_FILE" "$WORKFLOW_FILE"
  
  git add "$WORKFLOW_FILE"
  
  if git diff --staged --quiet; then
    echo "✅ No changes to commit"
  else
    echo "💾 Committing changes..."
    git commit -m "chore: update workflow to use PAT_TOKEN for submodule checkout"
    
    if [ -n "$PAT_TOKEN" ]; then
      echo "🚀 Pushing changes..."
      git remote set-url origin "https://x-access-token:${PAT_TOKEN}@github.com/Hexj13/kupito.club.git"
      git push origin main
      echo "✅ Workflow updated and pushed successfully!"
    else
      echo "⚠️  PAT_TOKEN not set. Changes committed locally but not pushed."
      echo "To push manually:"
      echo "  cd $REPO_DIR"
      echo "  git push origin main"
    fi
  fi
else
  echo "✅ Workflow file is already up to date"
fi

rm -f "$TEMP_FILE"
echo "✨ Done!"
