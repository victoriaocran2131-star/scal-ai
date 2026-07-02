Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "C:\Users\DELL\Scal AI" -NoNewWindow
Start-Sleep -Seconds 3
npx cloudflared tunnel --url http://localhost:3000 2>&1 | ForEach-Object { 
    $_ | Out-File -FilePath "C:\Users\DELL\Scal AI\url.txt" -Append
    if ($_ -match "https://") { 
        Write-Host "FOUND: $_"
    }
}
