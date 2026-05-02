$content = Get-Content "E:\PersonalWeb\styles.css" -Raw
$idx = $content.LastIndexOf("=======")
if ($idx -gt 0) {
    $content = $content.Substring(0, $idx)
    Set-Content -Path "E:\PersonalWeb\styles.css" -Value $content.TrimEnd()
    Write-Host "Fixed"
} else {
    Write-Host "No conflict found"
}