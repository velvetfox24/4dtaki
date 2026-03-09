#!/bin/bash
# 4D-Taki Project Setup Script for Kali Linux

echo "[*] Initializing 4D-Taki Project..."

# Initialize NPM if not already done
if [ ! -f package.json ]; then
    npm init -y
fi

# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor
npx cap init 4dtaki com.fourcreative.taki --web-dir www

# Create web directory and move files
mkdir -p www
cp index.html style.css game.js www/

# Add Android Platform
npx cap add android

# Sync project
npx cap sync

echo "[+] Setup Complete. Opening in Android Studio..."
npx cap open android
