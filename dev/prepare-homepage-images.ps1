# Optimized display derivatives only. Full-resolution Resources remain untouched.
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path $PSScriptRoot -Parent
$outputRoot = Join-Path $projectRoot 'assets\homepage'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$quality = [System.Drawing.Imaging.EncoderParameters]::new(1)
$quality.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]84)
$names = @('portrait-1.jpg', 'portrait-2.jpg', 'portrait-3.jpg') + (1..10 | ForEach-Object { 'sports-' + $_ + '.jpg' })
foreach ($name in $names) {
 $source = [System.Drawing.Image]::FromFile((Join-Path $projectRoot ('Resources\' + $name)))
 $scale = [Math]::Min([double]1.0, [Math]::Min([double](1100 / $source.Width), [double](1100 / $source.Height)))
 $targetWidth = [int][Math]::Max(1, $source.Width * $scale)
 $targetHeight = [int][Math]::Max(1, $source.Height * $scale)
 $target = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight)
 $graphics = [System.Drawing.Graphics]::FromImage($target)
 $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
 $target.Save((Join-Path $outputRoot $name), $jpegEncoder, $quality)
 $graphics.Dispose(); $target.Dispose(); $source.Dispose()
}
Get-ChildItem -LiteralPath $outputRoot | Measure-Object -Property Length -Sum | Select-Object Count, Sum
