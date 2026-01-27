#!/bin/bash

echo "========================================"
echo "   Socx Full-Stack Application Launcher"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required!"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node -v)"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Copying from env.example..."
    cp env.example .env
    echo
    echo "📝 Please edit .env file with your database credentials!"
    echo "Press Enter to continue..."
    read -r
fi

echo "✅ Starting Socx Application..."
echo
echo "Backend will run on: http://localhost:3000"
echo "Frontend will run on: http://localhost:9899"
echo
echo "Press Ctrl+C to stop both servers"
echo

# Start both backend and frontend
npm run dev:full