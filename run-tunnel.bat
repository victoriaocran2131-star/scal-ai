@echo off
cd /d C:\Users\DELL\ScalAI-Mobile
npx cloudflared tunnel --url http://localhost:3000 > C:\Users\DELL\cloudflare-output.txt 2>&1
