# Les originaux sont conserves hors Hosting ; aucune image de marque n'est redessinee.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$imageRoot = Split-Path -Parent $PSScriptRoot
$images = @(
    @{ Name = 'sifflet-ja.png'; Width = 96; Height = 96 },
    @{ Name = 'logo-ffessm-nage-avec-palmes.png'; Width = 320; Height = 192 }
)
foreach ($item in $images) {
    $original = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot "static-image-sources/$($item.Name)"))
    $bitmap = [System.Drawing.Bitmap]::new($item.Width, $item.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
    try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
        $rectangle = [System.Drawing.Rectangle]::new(0, 0, $item.Width, $item.Height)
        $graphics.DrawImage($original, $rectangle, 0, 0, $original.Width, $original.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
        $bitmap.Save((Join-Path $imageRoot $item.Name), [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output "$($item.Name) : $($item.Width) x $($item.Height)"
    } finally {
        $attributes.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
        $original.Dispose()
    }
}
