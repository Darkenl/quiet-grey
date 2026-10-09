param(
    [string]$Source = (Join-Path $PSScriptRoot 'Quiet-Grey.theme.css'),
    [string]$Target = (Join-Path $env:APPDATA 'Vencord\settings\quickCss.css')
)

# Vencord already watches QuickCSS; synchronizing the source triggers hot reload.
# One instance per user. Writes only when the source file's contents change.
$syncMutex = [Threading.Mutex]::new($false, 'Local\QuietGreyThemeSync')
if (-not $syncMutex.WaitOne(0)) { $syncMutex.Dispose(); exit }
try {
    $lastHash = ''
    while ($true) {
        try {
            if (Test-Path -LiteralPath $Source) {
                $sourceBytes = [IO.File]::ReadAllBytes($Source)
                $hashProvider = [Security.Cryptography.SHA256]::Create()
                try { $sourceHash = [BitConverter]::ToString($hashProvider.ComputeHash($sourceBytes)) }
                finally { $hashProvider.Dispose() }
                $accentValue = (Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\DWM' -Name AccentColor -ErrorAction Stop).AccentColor
                # DWM AccentColor stores its channels as AABBGGRR.
                $accentNumber = [uint32]$accentValue
                $accentHex = '#{0:x2}{1:x2}{2:x2}' -f ($accentNumber -band 255), (($accentNumber -shr 8) -band 255), (($accentNumber -shr 16) -band 255)
                $sourceHash += $accentHex
                if ($sourceHash -ne $lastHash) {
                    $accentCss = "`n:root { --quiet-windows-accent: $accentHex !important; }`n"
                    $accentBytes = [Text.Encoding]::UTF8.GetBytes($accentCss)
                    [IO.File]::WriteAllBytes($Target, [byte[]]($sourceBytes + $accentBytes))
                    $lastHash = $sourceHash
                }
            }
        } catch { Start-Sleep -Milliseconds 500 }
        Start-Sleep -Milliseconds 500
    }
} finally {
    $syncMutex.ReleaseMutex()
    $syncMutex.Dispose()
}
