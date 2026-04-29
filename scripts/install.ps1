# Vantage v0.3.0 -- Chromium installer (Windows)
#
# Strategy: persistent unpacked extension load via --load-extension launch flag
# baked into every Brave / Chrome / Edge / Vivaldi / Opera shortcut on the
# machine. Reason: Brave 147+ silently filters self-hosted CRX URLs out of
# the ExtensionInstallForcelist policy, so the obvious "enterprise policy"
# path is dead for non-CWS extensions. The launch-flag path works on every
# Chromium browser, doesn't require admin (for user-level shortcuts), and
# can be cleanly reversed.
#
# What the script does:
#   1. Download Vantage-vX.Y.Z.zip from the latest GitHub Release
#   2. Extract to %LOCALAPPDATA%\Vantage\extension (stable path, browsers
#      load from this on every launch)
#   3. Detect installed Chromium browsers
#   4. Find every Brave/Chrome/Edge/etc. .lnk shortcut (Start Menu, Desktop,
#      Taskbar pin, system-wide and per-user)
#   5. Append --load-extension="<extracted path>" to each shortcut's
#      arguments (idempotent -- reruns don't double-add)
#   6. Tell the user to relaunch their browser from any shortcut
#
# Run from any PowerShell window (auto-elevates to write system-wide shortcuts):
#   irm https://raw.githubusercontent.com/SysAdminDoc/Vantage/main/scripts/install.ps1 | iex
#
# Or with parameters (after downloading first):
#   .\install.ps1 -Browsers Brave,Chrome -NoPrompt
#   .\install.ps1 -Uninstall    # strip the flag and remove extension files
#   .\install.ps1 -Verify       # show which shortcuts carry the flag

#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Uninstall,
    [string[]]$Browsers,
    [switch]$NoPrompt,
    [switch]$Verify
)

$ErrorActionPreference = 'Stop'

$script:Version       = '0.3.0'
$script:RepoOwner     = 'SysAdminDoc'
$script:RepoName      = 'Vantage'
$script:SelfUrl       = "https://raw.githubusercontent.com/$($script:RepoOwner)/$($script:RepoName)/main/scripts/install.ps1"
$script:ZipUrlLatest  = "https://github.com/$($script:RepoOwner)/$($script:RepoName)/releases/latest/download/Vantage-v$($script:Version).zip"
$script:ExtensionDir  = Join-Path $env:LOCALAPPDATA 'Vantage\extension'

$BrowserDefs = @(
    [PSCustomObject]@{ Name = 'Chrome';   Exe = 'chrome.exe';  ExeRoots = @('Google\Chrome\Application'),                @('Program Files', 'Program Files (x86)') }
    [PSCustomObject]@{ Name = 'Brave';    Exe = 'brave.exe';   ExeRoots = @('BraveSoftware\Brave-Browser\Application'),  @('Program Files', 'Program Files (x86)') }
    [PSCustomObject]@{ Name = 'Edge';     Exe = 'msedge.exe';  ExeRoots = @('Microsoft\Edge\Application'),               @('Program Files', 'Program Files (x86)') }
    [PSCustomObject]@{ Name = 'Vivaldi';  Exe = 'vivaldi.exe'; ExeRoots = @('Vivaldi\Application'),                      @('Program Files', 'Program Files (x86)') }
    [PSCustomObject]@{ Name = 'Opera';    Exe = 'opera.exe';   ExeRoots = @('Opera'),                                    @('Program Files', 'Program Files (x86)') }
)

function Test-Admin {
    $current   = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-SelfPath {
    if ($PSCommandPath -and (Test-Path -LiteralPath $PSCommandPath)) { return $PSCommandPath }
    if ($MyInvocation.MyCommand.Path -and (Test-Path -LiteralPath $MyInvocation.MyCommand.Path)) {
        return $MyInvocation.MyCommand.Path
    }
    $temp = Join-Path $env:TEMP 'vantage-install.ps1'
    Write-Host "  Bootstrapping installer to $temp" -ForegroundColor DarkGray
    Invoke-WebRequest -Uri $script:SelfUrl -OutFile $temp -UseBasicParsing -ErrorAction Stop
    return $temp
}

function Invoke-Elevation {
    if ($Verify) { return }   # read-only mode
    if (Test-Admin) { return }
    Write-Host ""
    Write-Host "  Need admin rights to update system-wide Start Menu shortcuts." -ForegroundColor Yellow
    Write-Host "  Re-launching with elevation..."                                -ForegroundColor Yellow
    $sp = Get-SelfPath
    $a = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$sp`"")
    if ($Uninstall) { $a += '-Uninstall' }
    if ($NoPrompt)  { $a += '-NoPrompt' }
    if ($Browsers)  { $a += @('-Browsers') + $Browsers }
    try {
        Start-Process powershell.exe -Verb RunAs -ArgumentList $a -ErrorAction Stop | Out-Null
    } catch {
        Write-Host "  UAC declined or elevation failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    exit
}

function Find-InstalledBrowsers {
    $detected = @()
    foreach ($b in $BrowserDefs) {
        foreach ($pf in @("$env:ProgramFiles", "${env:ProgramFiles(x86)}", "$env:LOCALAPPDATA\Programs")) {
            if (-not $pf) { continue }
            foreach ($sub in $b.ExeRoots[0]) {
                $cand = Join-Path $pf "$sub\$($b.Exe)"
                if (Test-Path -LiteralPath $cand) {
                    $detected += [PSCustomObject]@{ Name = $b.Name; Exe = $b.Exe; Path = $cand }
                    break
                }
            }
        }
    }
    return ,$detected
}

function Find-Shortcuts {
    param([Parameter(Mandatory)][string]$ExeName)

    $roots = @(
        "$env:APPDATA\Microsoft\Windows\Start Menu",
        "$env:USERPROFILE\Desktop",
        "$env:PUBLIC\Desktop",
        "$env:ProgramData\Microsoft\Windows\Start Menu",
        "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch"
    )

    $found = @()
    $wsh = New-Object -ComObject WScript.Shell
    foreach ($root in $roots) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        Get-ChildItem -Path $root -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $sc = $wsh.CreateShortcut($_.FullName)
                $target = $sc.TargetPath
                if ($target -and (Split-Path -Leaf $target).ToLower() -eq $ExeName.ToLower()) {
                    $found += [PSCustomObject]@{ Path = $_.FullName; Target = $target; Args = $sc.Arguments }
                }
            } catch { }
        }
    }
    return ,$found
}

function Update-ShortcutAddFlag {
    param([Parameter(Mandatory)]$Shortcut, [Parameter(Mandatory)][string]$Flag)
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($Shortcut.Path)
    $current = $sc.Arguments
    # idempotent: if the same --load-extension="..." substring is already present, skip
    if ($current -match [regex]::Escape($Flag)) { return 'already' }
    $sc.Arguments = if ($current) { "$current $Flag" } else { $Flag }
    try { $sc.Save(); return 'modified' } catch { return "fail: $($_.Exception.Message)" }
}

function Update-ShortcutRemoveFlag {
    param([Parameter(Mandatory)]$Shortcut, [Parameter(Mandatory)][string]$ExtPath)
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($Shortcut.Path)
    $current = $sc.Arguments
    if (-not $current) { return 'no-args' }
    # remove --load-extension="<ExtPath>" or --load-extension=<ExtPath>
    $patterns = @(
        '--load-extension="' + [regex]::Escape($ExtPath) + '"',
        '--load-extension=' + [regex]::Escape($ExtPath)
    )
    $modified = $current
    foreach ($p in $patterns) { $modified = [regex]::Replace($modified, $p, '') }
    $modified = ($modified -replace '\s+', ' ').Trim()
    if ($modified -eq $current) { return 'absent' }
    $sc.Arguments = $modified
    try { $sc.Save(); return 'cleaned' } catch { return "fail: $($_.Exception.Message)" }
}

function Install-VantageExtension {
    Write-Host "  Downloading Vantage-v$($script:Version).zip ..." -ForegroundColor Cyan
    $tmp = Join-Path $env:TEMP "vantage-v$($script:Version).zip"
    Invoke-WebRequest -Uri $script:ZipUrlLatest -OutFile $tmp -UseBasicParsing
    Write-Host "    downloaded: $((Get-Item $tmp).Length) bytes" -ForegroundColor DarkGray

    if (Test-Path $script:ExtensionDir) {
        Write-Host "  Removing previous extension at $script:ExtensionDir" -ForegroundColor DarkGray
        Remove-Item -Path $script:ExtensionDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $script:ExtensionDir -Force | Out-Null

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($tmp, $script:ExtensionDir)
    Remove-Item $tmp -Force

    if (-not (Test-Path (Join-Path $script:ExtensionDir 'manifest.json'))) {
        throw "Extraction succeeded but manifest.json missing at $script:ExtensionDir"
    }
    Write-Host "    extracted to: $script:ExtensionDir" -ForegroundColor Green
}

function Show-Header {
    $bar = '=' * 56
    Write-Host ""
    Write-Host "  $bar"     -ForegroundColor DarkCyan
    Write-Host "  VANTAGE v$($script:Version)  --  Chromium installer" -ForegroundColor White
    Write-Host "  $bar"     -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  Strategy : --load-extension shortcut modification"   -ForegroundColor DarkGray
    Write-Host "  Extension: $script:ExtensionDir"                     -ForegroundColor DarkGray
    Write-Host ""
}

function Show-Menu {
    param([Parameter(Mandatory)][object[]]$Detected, [switch]$Uninstall)
    Write-Host "  Detected Chromium browsers:" -ForegroundColor Cyan
    Write-Host ""
    for ($i = 0; $i -lt $Detected.Count; $i++) {
        $num = $i + 1
        Write-Host "   [$num]  $($Detected[$i].Name)" -ForegroundColor White
    }
    Write-Host "   [A]  All of the above"
    Write-Host "   [Q]  Quit"
    Write-Host ""
    if ($Uninstall) {
        Write-Host "  Strip the load-extension flag from which browsers?" -ForegroundColor Cyan
    } else {
        Write-Host "  Install Vantage in which browsers?" -ForegroundColor Cyan
    }
    Write-Host "  Enter numbers (e.g. 1,3) or A for all:" -ForegroundColor Cyan -NoNewline
    Write-Host " " -NoNewline
    return Read-Host
}

function Resolve-Selection {
    param([string]$Selection, [object[]]$Detected)
    $clean = ($Selection | ForEach-Object { $_.ToString().Trim().ToUpper() })
    if ([string]::IsNullOrWhiteSpace($clean) -or $clean -eq 'Q') { return @() }
    if ($clean -eq 'A') { return $Detected }
    $tokens = $clean -split '[,\s]+' | Where-Object { $_ -match '^\d+$' }
    $picked = foreach ($t in $tokens) {
        $idx = [int]$t - 1
        if ($idx -ge 0 -and $idx -lt $Detected.Count) { $Detected[$idx] }
    }
    return ,$picked
}

# ---- Main ---------------------------------------------------------------

Invoke-Elevation
Clear-Host
Show-Header

$detected = Find-InstalledBrowsers
if (-not $detected -or $detected.Count -eq 0) {
    Write-Host "  No supported Chromium browsers detected." -ForegroundColor Red
    Read-Host "  Press Enter to close" | Out-Null
    exit 1
}

if ($Verify) {
    Write-Host "  Verify mode -- which shortcuts carry the load-extension flag:" -ForegroundColor Cyan
    Write-Host ""
    $flag = '--load-extension="' + $script:ExtensionDir + '"'
    foreach ($b in $detected) {
        Write-Host "  [$($b.Name)]" -ForegroundColor White
        $shortcuts = Find-Shortcuts -ExeName $b.Exe
        if (-not $shortcuts -or $shortcuts.Count -eq 0) {
            Write-Host "    (no shortcuts found)" -ForegroundColor DarkGray
            continue
        }
        foreach ($sc in $shortcuts) {
            $present = if ($sc.Args -match [regex]::Escape($flag)) { 'YES' } else { 'no ' }
            Write-Host "    [$present]  $($sc.Path)" -ForegroundColor $(if ($present -eq 'YES') {'Green'} else {'DarkGray'})
        }
    }
    Write-Host ""
    Write-Host "  Extension folder present: " -NoNewline
    if (Test-Path $script:ExtensionDir) {
        Write-Host "yes ($script:ExtensionDir)" -ForegroundColor Green
    } else {
        Write-Host "NO -- extension files are missing" -ForegroundColor Red
    }
    Write-Host ""
    if (-not $NoPrompt) { Read-Host "  Press Enter to close" | Out-Null }
    exit 0
}

if ($NoPrompt -and $Browsers) {
    $targets = $detected | Where-Object { $Browsers -contains $_.Name }
} else {
    $sel = Show-Menu -Detected $detected -Uninstall:$Uninstall
    $targets = Resolve-Selection -Selection $sel -Detected $detected
}

if (-not $targets -or $targets.Count -eq 0) {
    Write-Host ""
    Write-Host "  Nothing selected. Exiting." -ForegroundColor DarkGray
    exit 0
}

Write-Host ""

if ($Uninstall) {
    Write-Host "  Removing the load-extension flag from selected browsers..." -ForegroundColor Cyan
    foreach ($b in $targets) {
        $shortcuts = Find-Shortcuts -ExeName $b.Exe
        Write-Host "  [$($b.Name)]" -ForegroundColor White
        foreach ($sc in $shortcuts) {
            $r = Update-ShortcutRemoveFlag -Shortcut $sc -ExtPath $script:ExtensionDir
            $color = switch ($r) { 'cleaned' { 'Yellow' } 'absent' { 'DarkGray' } 'no-args' { 'DarkGray' } default { 'Red' } }
            Write-Host "    [$r]  $($sc.Path)" -ForegroundColor $color
        }
    }
    Write-Host ""
    Write-Host "  Removing extension files at $script:ExtensionDir" -ForegroundColor Cyan
    if (Test-Path $script:ExtensionDir) {
        Remove-Item -Path $script:ExtensionDir -Recurse -Force
        # also try parent if empty
        try { Remove-Item -Path (Split-Path $script:ExtensionDir) -ErrorAction SilentlyContinue } catch {}
        Write-Host "    removed" -ForegroundColor Yellow
    } else {
        Write-Host "    (already gone)" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "  Done. Restart your browser to drop Vantage." -ForegroundColor Green
    if (-not $NoPrompt) { Read-Host "  Press Enter to close" | Out-Null }
    exit 0
}

# Install path
Install-VantageExtension

$flag = '--load-extension="' + $script:ExtensionDir + '"'

foreach ($b in $targets) {
    Write-Host ""
    Write-Host "  [$($b.Name)] modifying shortcuts" -ForegroundColor Cyan
    $shortcuts = Find-Shortcuts -ExeName $b.Exe
    if (-not $shortcuts -or $shortcuts.Count -eq 0) {
        Write-Host "    (no shortcuts found -- nothing to modify)" -ForegroundColor DarkGray
        Write-Host "    you can still launch '$($b.Exe) $flag' manually" -ForegroundColor DarkGray
        continue
    }
    foreach ($sc in $shortcuts) {
        $r = Update-ShortcutAddFlag -Shortcut $sc -Flag $flag
        $color = switch ($r) { 'modified' {'Green'} 'already' {'DarkGray'} default {'Red'} }
        Write-Host "    [$r]  $($sc.Path)" -ForegroundColor $color
    }
}

Write-Host ""
Write-Host "  Done." -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    1. Fully quit your browser (close ALL windows + check Task Manager)" -ForegroundColor DarkGray
Write-Host "    2. Re-open it from a Start Menu / Taskbar / Desktop shortcut"        -ForegroundColor DarkGray
Write-Host "    3. Open a new tab -- Vantage is the new-tab page"                    -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Notes:" -ForegroundColor Cyan
Write-Host "    - The extension shows as 'Loaded unpacked' in chrome://extensions" -ForegroundColor DarkGray
Write-Host "    - To update, re-run this script. It downloads the latest release"  -ForegroundColor DarkGray
Write-Host "      and replaces the extension files in place"                       -ForegroundColor DarkGray
Write-Host "    - To remove, re-run with -Uninstall"                               -ForegroundColor DarkGray
Write-Host ""
if (-not $NoPrompt) { Read-Host "  Press Enter to close" | Out-Null }
