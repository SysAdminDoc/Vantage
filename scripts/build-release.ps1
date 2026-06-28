# Vantage local release artifact builder.
#
# Cleans stale release artifacts, builds Chromium ZIP, Firefox XPI, CRX3, and
# SHA256SUMS.txt under dist/, then verifies runtime package contents against
# scripts/runtime-allowlist.json.

#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Version,

    [string]$OutputPath,

    [string]$PemPath,

    [switch]$SkipFeedValidation
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$RepoFull = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\')

function Read-JsonFile {
    param([Parameter(Mandatory)][string]$Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Assert-SafeRelativePath {
    param(
        [Parameter(Mandatory)][string]$Value,
        [Parameter(Mandatory)][string]$Label
    )

    $normalized = $Value.Trim().Replace('\', '/')
    if ([string]::IsNullOrWhiteSpace($normalized) -or
        $normalized.StartsWith('/') -or
        $normalized -match '^[A-Za-z]:' -or
        $normalized -match '(^|/)\.\.?(/|$)' -or
        $normalized -match '//') {
        throw "$Label is not a safe relative path: $Value"
    }
    return $normalized
}

function Assert-RepoChildPath {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Label
    )

    $full = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
    $prefix = $RepoFull + '\'
    if ($full -eq $RepoFull -or -not $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must stay under the repo root: $full"
    }
    return $full
}

function Get-PythonCommand {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return @{ Command = $python.Source; Prefix = @() }
    }
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        return @{ Command = $py.Source; Prefix = @('-3') }
    }
    throw 'Python 3 is required for release package verification.'
}

function Invoke-Python {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $python = Get-PythonCommand
    & $python.Command @($python.Prefix + $Arguments)
    if ($LASTEXITCODE -ne 0) {
        throw "Python command failed: $($Arguments -join ' ')"
    }
}

function Add-RuntimeEntry {
    param(
        [System.Collections.Generic.List[object]]$Entries,
        [Parameter(Mandatory)][string]$RelativePath,
        [string]$DestinationName
    )

    $safePath = Assert-SafeRelativePath -Value $RelativePath -Label 'runtime path'
    $source = Join-Path $RepoRoot $safePath
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Required runtime item missing: $safePath"
    }

    if (Test-Path -LiteralPath $source -PathType Container) {
        Get-ChildItem -LiteralPath $source -Recurse -File |
            Sort-Object FullName |
            ForEach-Object {
                $repoRelative = $_.FullName.Substring($RepoFull.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
                [void]$Entries.Add([pscustomobject]@{
                    Source = $_.FullName
                    Entry = Assert-SafeRelativePath -Value $repoRelative -Label 'archive entry'
                })
            }
        return
    }

    $entry = if ($DestinationName) { $DestinationName } else { $safePath }
    [void]$Entries.Add([pscustomobject]@{
        Source = $source
        Entry = Assert-SafeRelativePath -Value $entry -Label 'archive entry'
    })
}

function Get-RuntimeEntries {
    param(
        [Parameter(Mandatory)][ValidateSet('chromium', 'firefox')][string]$Target,
        [Parameter(Mandatory)]$Allowlist
    )

    $entries = New-Object 'System.Collections.Generic.List[object]'
    $manifestSource = if ($Target -eq 'firefox') { [string]$Allowlist.firefox_manifest } else { [string]$Allowlist.chromium_manifest }
    Add-RuntimeEntry -Entries $entries -RelativePath $manifestSource -DestinationName 'manifest.json'

    foreach ($item in @($Allowlist.items)) {
        Add-RuntimeEntry -Entries $entries -RelativePath ([string]$item)
    }

    return $entries
}

function New-RuntimePackage {
    param(
        [Parameter(Mandatory)][ValidateSet('chromium', 'firefox')][string]$Target,
        [Parameter(Mandatory)]$Allowlist,
        [Parameter(Mandatory)][string]$OutputFile
    )

    if (Test-Path -LiteralPath $OutputFile) {
        Remove-Item -LiteralPath $OutputFile -Force
    }

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::Open($OutputFile, [System.IO.Compression.ZipArchiveMode]::Create)
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'

    try {
        foreach ($entry in Get-RuntimeEntries -Target $Target -Allowlist $Allowlist) {
            if (-not $seen.Add($entry.Entry)) {
                throw "Duplicate archive entry: $($entry.Entry)"
            }
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                $entry.Source,
                $entry.Entry,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    } finally {
        $archive.Dispose()
    }

    Write-Host "  ok  $OutputFile"
}

function Get-Sha256Hex {
    param([Parameter(Mandatory)][string]$Path)

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $hash = $sha256.ComputeHash($stream)
    } finally {
        $stream.Dispose()
        $sha256.Dispose()
    }
    return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
}

$Manifest = Read-JsonFile (Join-Path $RepoRoot 'manifest.json')
if (-not $Version) {
    $Version = [string]$Manifest.version
}
if (-not ($Version -match '^\d+\.\d+\.\d+$')) {
    throw "Version must be SemVer X.Y.Z, got '$Version'"
}

if (-not $OutputPath) {
    $OutputPath = Join-Path $RepoRoot 'dist'
}
$DistFull = Assert-RepoChildPath -Path $OutputPath -Label 'OutputPath'
New-Item -ItemType Directory -Path $DistFull -Force | Out-Null

if (-not $PemPath) {
    $PemPath = Join-Path $RepoRoot 'Vantage-selfhost.pem'
}
$PemFull = [System.IO.Path]::GetFullPath($PemPath)
if (-not (Test-Path -LiteralPath $PemFull -PathType Leaf)) {
    throw "CRX signing key not found: $PemFull"
}

$validationArgs = @{ Version = $Version }
if ($SkipFeedValidation) {
    $validationArgs.SkipFeedValidation = $true
}
& (Join-Path $PSScriptRoot 'validate-release-metadata.ps1') @validationArgs

Write-Host "Cleaning previous release artifacts from $DistFull"
foreach ($pattern in @('Vantage-v*.zip', 'Vantage-v*.crx', 'Vantage-v*-firefox.xpi', 'SHA256SUMS.txt')) {
    Get-ChildItem -LiteralPath $DistFull -Filter $pattern -File -ErrorAction SilentlyContinue |
        Remove-Item -Force
}

$Allowlist = Read-JsonFile (Join-Path $PSScriptRoot 'runtime-allowlist.json')
$ChromiumZip = Join-Path $DistFull "Vantage-v$Version.zip"
$FirefoxXpi = Join-Path $DistFull "Vantage-v$Version-firefox.xpi"
$ChromiumCrx = Join-Path $DistFull "Vantage-v$Version.crx"
$SumsPath = Join-Path $DistFull 'SHA256SUMS.txt'

Write-Host "Building runtime packages for v$Version"
New-RuntimePackage -Target chromium -Allowlist $Allowlist -OutputFile $ChromiumZip
New-RuntimePackage -Target firefox -Allowlist $Allowlist -OutputFile $FirefoxXpi

Invoke-Python -Arguments @((Join-Path $PSScriptRoot 'verify-runtime-package.py'), $ChromiumZip, '--target', 'chromium')
Invoke-Python -Arguments @((Join-Path $PSScriptRoot 'verify-runtime-package.py'), $FirefoxXpi, '--target', 'firefox')

Write-Host "Signing CRX3"
Invoke-Python -Arguments @((Join-Path $PSScriptRoot 'build-crx.py'), $ChromiumZip, $PemFull, $ChromiumCrx)

$Artifacts = @($ChromiumZip, $ChromiumCrx, $FirefoxXpi)
$ChecksumLines = foreach ($artifact in $Artifacts) {
    $hash = Get-Sha256Hex -Path $artifact
    "$hash  $([System.IO.Path]::GetFileName($artifact))"
}
$ChecksumLines | Set-Content -LiteralPath $SumsPath -Encoding ASCII

Write-Host "  ok  $SumsPath"
Write-Host ''
Write-Host 'Release artifacts ready:'
foreach ($artifact in $Artifacts + @($SumsPath)) {
    Write-Host "  $artifact"
}
