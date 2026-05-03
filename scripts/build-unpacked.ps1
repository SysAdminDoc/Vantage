# Vantage local unpacked-extension builder.
#
# Creates a clean runtime-only folder for browser "Load unpacked" testing.
# Output is intentionally written under dist/ by default, which is ignored by Git.

#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('chromium', 'firefox')]
    [string]$Target = 'chromium',

    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

if (-not $OutputPath) {
    $OutputPath = Join-Path $RepoRoot "dist\unpacked-$Target"
}

$OutputFull = [System.IO.Path]::GetFullPath($OutputPath)
$RepoFull = [System.IO.Path]::GetFullPath($RepoRoot)
$DistFull = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot 'dist'))
$MarkerFile = Join-Path $OutputFull '.vantage-unpacked'

if ($OutputFull -eq $RepoFull -or $OutputFull -eq $DistFull -or [string]::IsNullOrWhiteSpace((Split-Path -Leaf $OutputFull))) {
    throw "Refusing to write unpacked extension to unsafe output path: $OutputFull"
}

if (Test-Path -LiteralPath $OutputFull) {
    if (-not (Test-Path -LiteralPath $MarkerFile)) {
        throw "Refusing to overwrite existing folder without .vantage-unpacked marker: $OutputFull"
    }
    Remove-Item -LiteralPath $OutputFull -Recurse -Force
}

New-Item -ItemType Directory -Path $OutputFull -Force | Out-Null

$ManifestSource = if ($Target -eq 'firefox') { 'manifest.firefox.json' } else { 'manifest.json' }

$RuntimeItems = @(
    $ManifestSource,
    'newtab.html',
    'sidepanel.html',
    'qa-scenes.html',
    'src',
    'icons',
    'assets',
    '_locales',
    'LICENSE',
    'PRIVACY.md'
)

foreach ($Item in $RuntimeItems) {
    $Source = Join-Path $RepoRoot $Item
    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Required runtime item missing: $Item"
    }

    $DestinationName = if ($Item -eq $ManifestSource) { 'manifest.json' } else { $Item }
    $Destination = Join-Path $OutputFull $DestinationName

    if (Test-Path -LiteralPath $Source -PathType Container) {
        Copy-Item -LiteralPath $Source -Destination $Destination -Recurse
    } else {
        Copy-Item -LiteralPath $Source -Destination $Destination
    }
}

New-Item -ItemType File -Path $MarkerFile -Force | Out-Null

$ManifestPath = Join-Path $OutputFull 'manifest.json'
$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

$LocalesDir = Join-Path $OutputFull '_locales'
if (Test-Path -LiteralPath $LocalesDir) {
    if (-not $Manifest.default_locale) {
        throw "manifest.json must declare default_locale because _locales is present"
    }
    $DefaultLocaleDir = Join-Path $LocalesDir $Manifest.default_locale
    if (-not (Test-Path -LiteralPath $DefaultLocaleDir -PathType Container)) {
        throw "default_locale '$($Manifest.default_locale)' does not exist under _locales"
    }
}

$ReferencedFiles = New-Object System.Collections.Generic.List[string]

if ($Manifest.chrome_url_overrides -and $Manifest.chrome_url_overrides.newtab) {
    $ReferencedFiles.Add($Manifest.chrome_url_overrides.newtab)
}
if ($Manifest.background -and $Manifest.background.service_worker) {
    $ReferencedFiles.Add($Manifest.background.service_worker)
}
if ($Manifest.side_panel -and $Manifest.side_panel.default_path) {
    $ReferencedFiles.Add($Manifest.side_panel.default_path)
}
if ($Manifest.icons) {
    foreach ($Icon in $Manifest.icons.PSObject.Properties) {
        if ($Icon.Value) { $ReferencedFiles.Add([string]$Icon.Value) }
    }
}
if ($Manifest.action -and $Manifest.action.default_icon) {
    foreach ($Icon in $Manifest.action.default_icon.PSObject.Properties) {
        if ($Icon.Value) { $ReferencedFiles.Add([string]$Icon.Value) }
    }
}

$Missing = @()
foreach ($RelativePath in ($ReferencedFiles | Select-Object -Unique)) {
    $Candidate = Join-Path $OutputFull $RelativePath
    if (-not (Test-Path -LiteralPath $Candidate)) {
        $Missing += $RelativePath
    }
}

if ($Missing.Count -gt 0) {
    throw "Unpacked folder is missing manifest-referenced files: $($Missing -join ', ')"
}

Write-Host "Vantage unpacked extension ready:"
Write-Host "  Target : $Target"
Write-Host "  Folder : $OutputFull"
Write-Host ""
if ($Target -eq 'firefox') {
    Write-Host "Firefox temporary install: about:debugging -> This Firefox -> Load Temporary Add-on -> select manifest.json in that folder."
} else {
    Write-Host "Chromium install: chrome://extensions -> Developer mode -> Load unpacked -> select that folder."
}
