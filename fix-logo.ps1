$files = Get-ChildItem -Path "e:\个人网站\PersonalWeb" -Recurse -Include "*.html" | Where-Object { $_.FullName -notmatch "node_modules" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $content = $content -replace 'Logo\.png', '微信头像.jpg'
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    Write-Host "Updated: $($file.FullName)"
}