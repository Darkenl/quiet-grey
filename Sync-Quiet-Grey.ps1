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
                if ($sourceHash -ne $lastHash) {
                    [IO.File]::WriteAllBytes($Target, $sourceBytes)
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
