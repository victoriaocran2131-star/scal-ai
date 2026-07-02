$process = Start-Process -FilePath "npx" -ArgumentList "cloudflared tunnel --url http://localhost:3000" -NoNewWindow -PassThru -RedirectStandardOutput "C:\Users\DELL\Scal AI\newurl.txt" -RedirectStandardError "C:\Users\DELL\Scal AI\newurl-err.txt"
Start-Sleep -Seconds 15
Get-Content "C:\Users\DELL\Scal AI\newurl.txt" -ErrorAction SilentlyContinue
Get-Content "C:\Users\DELL\Scal AI\newurl-err.txt" -ErrorAction SilentlyContinue
