# Vantage release metadata preflight.
#
# Validates that release-facing version sources agree before local packaging or CI.

#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Version,

    [switch]$SkipFeedValidation
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

$IgnoredDocLinks = [regex]::Matches($Readme, '\]\((docs/[^)]+|PRIVACY\.md|ROADMAP\.md|RESEARCH\.md|CHANGELOG\.md)(?:#[^)]+)?\)')
if ($IgnoredDocLinks.Count -gt 0) {
    $Mismatches += "README.md links local-only markdown files: $((($IgnoredDocLinks | ForEach-Object { $_.Groups[1].Value }) | Sort-Object -Unique) -join ', ')"
}

foreach ($Anchor in @('## Install', '## Customize', '### Privacy & network')) {
    if ($Readme -notmatch [regex]::Escape($Anchor)) {
        $Mismatches += "README.md missing required public section: $Anchor"
    }
}

if (-not $SkipFeedValidation) {
    $ExpectedCrxUrl = "https://github.com/SysAdminDoc/Vantage/releases/download/v$Version/Vantage-v$Version.crx"
    $ExpectedXpiUrl = "https://github.com/SysAdminDoc/Vantage/releases/download/v$Version/Vantage-v$Version-firefox.xpi"

    $UpdatesXml = Read-TextFile 'updates.xml'
    try {
        [xml]$UpdatesXmlDoc = $UpdatesXml
    } catch {
        $Mismatches += "updates.xml is not valid XML: $($_.Exception.Message)"
    }
    $UpdateCheck = $UpdatesXmlDoc.gupdate.app.updatecheck
    if (-not $UpdateCheck) {
        $Mismatches += "updates.xml missing gupdate/app/updatecheck"
    } else {
        if ([string]$UpdateCheck.version -ne $Version) {
            $Mismatches += "updates.xml updatecheck version says $($UpdateCheck.version), expected $Version"
        }
        if ([string]$UpdateCheck.codebase -ne $ExpectedCrxUrl) {
            $Mismatches += "updates.xml CRX URL says $($UpdateCheck.codebase), expected $ExpectedCrxUrl"
        }
        if ([string]$UpdateCheck.hash_sha256 -notmatch '^[a-fA-F0-9]{64}$') {
            $Mismatches += "updates.xml hash_sha256 must be a non-empty 64-hex SHA-256"
        }
    }

    $FirefoxUpdates = Read-JsonFile 'firefox-updates.json'
    $FirefoxUpdate = $FirefoxUpdates.addons.'vantage@sysadmindoc'.updates[0]
    if (-not $FirefoxUpdate) {
        $Mismatches += "firefox-updates.json missing vantage@sysadmindoc update entry"
    } else {
        if ([string]$FirefoxUpdate.version -ne $Version) {
            $Mismatches += "firefox-updates.json update version says $($FirefoxUpdate.version), expected $Version"
        }
        if ([string]$FirefoxUpdate.update_link -ne $ExpectedXpiUrl) {
            $Mismatches += "firefox-updates.json XPI URL says $($FirefoxUpdate.update_link), expected $ExpectedXpiUrl"
        }
        if ([string]$FirefoxUpdate.update_hash -notmatch '^sha256:[a-fA-F0-9]{64}$') {
            $Mismatches += "firefox-updates.json update_hash must be sha256:<64-hex>"
        }
    }
}

if ($Mismatches.Count -gt 0) {
    throw "Release metadata mismatch:`n - $($Mismatches -join "`n - ")"
}

$Suffix = if ($SkipFeedValidation) { ' (feed validation skipped)' } else { '' }
Write-Host "Release metadata OK for v$Version$Suffix"
