# Vantage release metadata preflight.
#
# Validates that release-facing version sources agree before local packaging or CI.

#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Version
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

function Read-JsonFile {
    param([Parameter(Mandatory)][string]$RelativePath)
    $path = Join-Path $RepoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required metadata file missing: $RelativePath"
    }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}

function Read-TextFile {
    param([Parameter(Mandatory)][string]$RelativePath)
    $path = Join-Path $RepoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required metadata file missing: $RelativePath"
    }
    return Get-Content -LiteralPath $path -Raw
}

$ChromeManifest = Read-JsonFile 'manifest.json'
$FirefoxManifest = Read-JsonFile 'manifest.firefox.json'
$PackageJson = Read-JsonFile 'package.json'

if (-not $Version) {
    $Version = [string]$ChromeManifest.version
}

if (-not ($Version -match '^\d+\.\d+\.\d+$')) {
    throw "Version must be SemVer X.Y.Z, got '$Version'"
}

$Expected = @{
    'manifest.json' = [string]$ChromeManifest.version
    'manifest.firefox.json' = [string]$FirefoxManifest.version
    'package.json' = [string]$PackageJson.version
}

$Mismatches = @()
foreach ($entry in $Expected.GetEnumerator()) {
    if ($entry.Value -ne $Version) {
        $Mismatches += "$($entry.Key) says $($entry.Value), expected $Version"
    }
}

$Readme = Read-TextFile 'README.md'
if ($Readme -notmatch [regex]::Escape("badge/version-$Version-")) {
    $Mismatches += "README.md version badge does not say $Version"
}

$Privacy = Read-TextFile 'PRIVACY.md'
if ($Privacy -notmatch [regex]::Escape("Vantage Privacy Policy v$Version")) {
    $Mismatches += "PRIVACY.md footer does not say v$Version"
}

$StoreGuide = Read-TextFile 'docs/store-submission-guide.md'
if ($StoreGuide -notmatch [regex]::Escape("Vantage v$Version Store Submission Guide")) {
    $Mismatches += "docs/store-submission-guide.md title does not say v$Version"
}

$UpdatesXml = Read-TextFile 'updates.xml'
if ($UpdatesXml -notmatch [regex]::Escape("version=""$Version""")) {
    $Mismatches += "updates.xml updatecheck version does not say $Version"
}
if ($UpdatesXml -notmatch [regex]::Escape("/releases/download/v$Version/Vantage-v$Version.crx")) {
    $Mismatches += "updates.xml CRX URL does not point at v$Version"
}

$FirefoxUpdates = Read-JsonFile 'firefox-updates.json'
$FirefoxUpdate = $FirefoxUpdates.addons.'vantage@sysadmindoc'.updates[0]
if ([string]$FirefoxUpdate.version -ne $Version) {
    $Mismatches += "firefox-updates.json update version says $($FirefoxUpdate.version), expected $Version"
}
if ([string]$FirefoxUpdate.update_link -notmatch [regex]::Escape("/releases/download/v$Version/Vantage-v$Version-firefox.xpi")) {
    $Mismatches += "firefox-updates.json XPI URL does not point at v$Version"
}

if ($Mismatches.Count -gt 0) {
    throw "Release metadata mismatch:`n - $($Mismatches -join "`n - ")"
}

Write-Host "Release metadata OK for v$Version"
