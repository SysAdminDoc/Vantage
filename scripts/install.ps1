# Vantage v0.3.0 — Enterprise Policy installer for Chromium browsers (Windows)
#
# Wires up HKLM\Software\Policies\<vendor>\<browser>\ExtensionInstallForcelist
# so the browser auto-installs Vantage on next launch by fetching the
# self-hosted updates.xml and the signed CRX from GitHub Releases.
#
# Usage (right-click -> Run with PowerShell, or from an elevated prompt):
#
#   # Interactive (menu, recommended)
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1
#
#   # Non-interactive
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Browsers Chrome,Brave -NoPrompt
#
#   # Remove the policy entry only (extension stops being force-managed)
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Uninstall
#
# Run from anywhere — the script knows the extension ID and update URL itself.

#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Uninstall,
    [string[]]$Browsers,
    [switch]$NoPrompt
)

$ErrorActionPreference = 'Stop'

# Pinned for the lifetime of the project. Do NOT change without re-signing
# every release with a new key (the extension ID is derived from the key).
$ExtensionId = 'hkfepknnglonkidihcoicdfkjkjfnejn'
$UpdateUrl   = 'https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/updates.xml'

$BrowserPolicies = @(
    [PSCustomObject]@{
        Name       = 'Chrome'
        ExePaths   = @(
            'C:\Program Files\Google\Chrome\Application\chrome.exe',
            'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
        )
        PolicyKey  = 'HKLM:\Software\Policies\Google\Chrome\ExtensionInstallForcelist'
    },
    [PSCustomObject]@{
        Name       = 'Brave'
        ExePaths   = @(
            'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe',
            'C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'
        )
        PolicyKey  = 'HKLM:\Software\Policies\BraveSoftware\Brave\ExtensionInstallForcelist'
    },
    [PSCustomObject]@{
        Name       = 'Edge'
        ExePaths   = @(
            'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
        )
        PolicyKey  = 'HKLM:\Software\Policies\Microsoft\Edge\ExtensionInstallForcelist'
    },
    [PSCustomObject]@{
        Name       = 'Vivaldi'
        ExePaths   = @(
            'C:\Program Files\Vivaldi\Application\vivaldi.exe',
            'C:\Program Files (x86)\Vivaldi\Application\vivaldi.exe'
        )
        PolicyKey  = 'HKLM:\Software\Policies\Vivaldi\ExtensionInstallForcelist'
    },
    [PSCustomObject]@{
        Name       = 'Opera'
        ExePaths   = @(
            "$env:LOCALAPPDATA\Programs\Opera\opera.exe",
            'C:\Program Files\Opera\opera.exe'
        )
        PolicyKey  = 'HKLM:\Software\Policies\Opera Software\Opera Stable\ExtensionInstallForcelist'
    },
    [PSCustomObject]@{
        Name       = 'Chromium'
        ExePaths   = @(
            'C:\Program Files\Chromium\Application\chrome.exe'
        )
        PolicyKey  = 'HKLM:\Software\Policies\Chromium\ExtensionInstallForcelist'
    }
)

function Test-Admin {
    $current   = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-Elevation {
    if (Test-Admin) { return }

    Write-Host ""
    Write-Host "  Administrator rights are required to write registry policy." -ForegroundColor Yellow
    Write-Host "  Re-launching with elevation..."                              -ForegroundColor Yellow
    Write-Host ""

    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
    if ($Uninstall) { $argList += '-Uninstall' }
    if ($NoPrompt)  { $argList += '-NoPrompt' }
    if ($Browsers)  { $argList += @('-Browsers') + $Browsers }

    Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs | Out-Null
    exit
}

function Find-InstalledBrowsers {
    $detected = @()
    foreach ($b in $BrowserPolicies) {
        foreach ($exe in $b.ExePaths) {
            if (Test-Path $exe) {
                $detected += $b
                break
            }
        }
    }
    return ,$detected
}

function Write-Header {
    $title  = '  VANTAGE  -  Enterprise Policy installer  '
    $bar    = ('=' * $title.Length)
    Write-Host ""
    Write-Host $bar   -ForegroundColor DarkCyan
    Write-Host $title -ForegroundColor White
    Write-Host $bar   -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  Extension ID : $ExtensionId" -ForegroundColor DarkGray
    Write-Host "  Update URL   : $UpdateUrl"   -ForegroundColor DarkGray
    Write-Host ""
}

function Show-Menu {
    param([Parameter(Mandatory)][object[]]$Detected, [switch]$Uninstall)

    $verb = if ($Uninstall) { 'remove the policy from' } else { 'install Vantage in' }

    Write-Host "  Detected Chromium browsers:" -ForegroundColor Cyan
    Write-Host ""
    for ($i = 0; $i -lt $Detected.Count; $i++) {
        $marker = '  '
        Write-Host "   [$($i + 1)]  $($Detected[$i].Name)" -ForegroundColor White
    }
    Write-Host "   [A]  All of the above"
    Write-Host "   [Q]  Quit"
    Write-Host ""
    Write-Host "  Which browsers should I $verb?" -ForegroundColor Cyan
    Write-Host "  Enter numbers (e.g. 1,3) or A for all, then press Enter:" -ForegroundColor Cyan -NoNewline
    Write-Host " " -NoNewline
    return Read-Host
}

function Resolve-Selection {
    param([string]$Input, [object[]]$Detected)
    $clean = ($Input | ForEach-Object { $_.ToString().Trim().ToUpper() })
    if ([string]::IsNullOrWhiteSpace($clean) -or $clean -eq 'Q') { return @() }
    if ($clean -eq 'A') { return $Detected }
    $tokens = $clean -split '[,\s]+' | Where-Object { $_ -match '^\d+$' }
    $picked = foreach ($t in $tokens) {
        $idx = [int]$t - 1
        if ($idx -ge 0 -and $idx -lt $Detected.Count) { $Detected[$idx] }
    }
    return ,$picked
}

function Install-VantagePolicy {
    param([Parameter(Mandatory)]$Browser)

    $key = $Browser.PolicyKey
    if (-not (Test-Path $key)) {
        New-Item -Path $key -Force | Out-Null
    }

    $value     = "$ExtensionId;$UpdateUrl"
    $existing  = (Get-Item $key).Property

    foreach ($name in $existing) {
        $current = (Get-ItemProperty -Path $key -Name $name).$name
        if ($current -eq $value) {
            Write-Host ("  [{0,-9}]  already configured" -f $Browser.Name) -ForegroundColor DarkGray
            return
        }
        if ($current -like "$ExtensionId;*") {
            # Same extension, different update URL -> overwrite
            Set-ItemProperty -Path $key -Name $name -Value $value -Type String
            Write-Host ("  [{0,-9}]  policy refreshed (slot {1})" -f $Browser.Name, $name) -ForegroundColor Green
            return
        }
    }

    $idx = 1
    while ($existing -contains "$idx") { $idx++ }
    Set-ItemProperty -Path $key -Name "$idx" -Value $value -Type String
    Write-Host ("  [{0,-9}]  policy written (slot {1})" -f $Browser.Name, $idx) -ForegroundColor Green
}

function Uninstall-VantagePolicy {
    param([Parameter(Mandatory)]$Browser)

    $key = $Browser.PolicyKey
    if (-not (Test-Path $key)) {
        Write-Host ("  [{0,-9}]  no policy present" -f $Browser.Name) -ForegroundColor DarkGray
        return
    }
    $existing = (Get-Item $key).Property
    $removed  = 0
    foreach ($name in $existing) {
        $current = (Get-ItemProperty -Path $key -Name $name).$name
        if ($current -like "$ExtensionId;*") {
            Remove-ItemProperty -Path $key -Name $name
            $removed++
        }
    }
    if ($removed -gt 0) {
        Write-Host ("  [{0,-9}]  policy removed ({1} entr{2})" -f $Browser.Name, $removed, $(if ($removed -eq 1){'y'}else{'ies'})) -ForegroundColor Yellow
    } else {
        Write-Host ("  [{0,-9}]  no Vantage entry to remove" -f $Browser.Name) -ForegroundColor DarkGray
    }
}

# ---- Main ---------------------------------------------------------------

Invoke-Elevation
Clear-Host
Write-Header

$detected = Find-InstalledBrowsers
if (-not $detected -or $detected.Count -eq 0) {
    Write-Host "  No supported Chromium browsers detected." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Looked for:" -ForegroundColor DarkGray
    foreach ($b in $BrowserPolicies) {
        Write-Host ("    - {0,-9}  {1}" -f $b.Name, ($b.ExePaths -join ' | ')) -ForegroundColor DarkGray
    }
    Write-Host ""
    Read-Host "  Press Enter to close"
    exit 1
}

if ($NoPrompt -and $Browsers) {
    $targets = $detected | Where-Object { $Browsers -contains $_.Name }
    if ($targets.Count -eq 0) {
        Write-Host "  None of the requested browsers ($($Browsers -join ', ')) were detected." -ForegroundColor Red
        exit 1
    }
} else {
    $selection = Show-Menu -Detected $detected -Uninstall:$Uninstall
    $targets   = Resolve-Selection -Input $selection -Detected $detected
}

if ($targets.Count -eq 0) {
    Write-Host ""
    Write-Host "  Nothing selected. Exiting." -ForegroundColor DarkGray
    exit 0
}

Write-Host ""
Write-Host ("  {0}:" -f $(if ($Uninstall) {'Removing policy'} else {'Writing policy'})) -ForegroundColor Cyan
Write-Host ""
foreach ($b in $targets) {
    if ($Uninstall) { Uninstall-VantagePolicy -Browser $b } else { Install-VantagePolicy -Browser $b }
}

Write-Host ""
Write-Host "  Done." -ForegroundColor Green
Write-Host ""

if (-not $Uninstall) {
    Write-Host "  Next steps:" -ForegroundColor Cyan
    Write-Host "    1. Quit ALL windows of the browser(s) you just configured."
    Write-Host "    2. Re-open the browser."
    Write-Host "    3. Open a new tab. Vantage installs automatically within ~30 seconds."
    Write-Host ""
    Write-Host "  Notes:" -ForegroundColor Cyan
    Write-Host "    - The extension is force-managed while the policy exists." -ForegroundColor DarkGray
    Write-Host "    - It cannot be disabled or removed via the Extensions page" -ForegroundColor DarkGray
    Write-Host "      until you re-run this script with -Uninstall."             -ForegroundColor DarkGray
    Write-Host "    - Future Vantage releases auto-update via the same policy." -ForegroundColor DarkGray
} else {
    Write-Host "  Notes:" -ForegroundColor Cyan
    Write-Host "    - Restart the browser to pick up the policy removal."  -ForegroundColor DarkGray
    Write-Host "    - The extension is no longer force-managed; you can"   -ForegroundColor DarkGray
    Write-Host "      disable or remove it manually from chrome://extensions." -ForegroundColor DarkGray
}

Write-Host ""
if (-not $NoPrompt) {
    Read-Host "  Press Enter to close"
}
