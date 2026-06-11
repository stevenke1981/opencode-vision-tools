# OpenCode Vision — Windows desktop eyes (screenshot + window/app locate)
# Called by opencode-vision-tools-runner.ts; do not run directly unless debugging.
param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string]$Path = "",
    [string]$Query = "",
    [int]$ProcessId = 0,
    [string]$Title = "",
    [int]$X = 0,
    [int]$Y = 0,
    [int]$Width = 0,
    [int]$Height = 0,
    [int]$Limit = 30,
    [switch]$IncludeHidden
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class VisionWin32 {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

function Get-WindowList {
    $results = New-Object System.Collections.Generic.List[object]
    $callback = [VisionWin32+EnumWindowsProc]{
        param([IntPtr]$hWnd, [IntPtr]$lParam)
        if (-not $IncludeHidden -and -not [VisionWin32]::IsWindowVisible($hWnd)) { return $true }
        $sb = New-Object System.Text.StringBuilder 512
        [void][VisionWin32]::GetWindowText($hWnd, $sb, 512)
        $title = $sb.ToString()
        if ([string]::IsNullOrWhiteSpace($title)) { return $true }
        $pidOut = [uint32]0
        [void][VisionWin32]::GetWindowThreadProcessId($hWnd, [ref]$pidOut)
        $rect = New-Object VisionWin32+RECT
        [void][VisionWin32]::GetWindowRect($hWnd, [ref]$rect)
        $procName = ""
        try { $procName = (Get-Process -Id $pidOut -ErrorAction Stop).ProcessName } catch {}
        $results.Add([pscustomobject]@{
            hwnd    = $hWnd.ToInt64()
            pid     = [int]$pidOut
            process = $procName
            title   = $title
            x       = $rect.Left
            y       = $rect.Top
            width   = $rect.Right - $rect.Left
            height  = $rect.Bottom - $rect.Top
        }) | Out-Null
        return $true
    }
    [VisionWin32]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
    return $results | Sort-Object title
}

function Save-Bitmap($bitmap, [string]$outPath) {
    $dir = Split-Path $outPath -Parent
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Capture-ScreenRegion([int]$rx, [int]$ry, [int]$rw, [int]$rh, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap $rw, $rh
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $src = New-Object System.Drawing.Point $rx, $ry
    $dest = New-Object System.Drawing.Point 0, 0
    $size = New-Object System.Drawing.Size $rw, $rh
    $g.CopyFromScreen($src, $dest, $size, [System.Drawing.CopyPixelOperation]::SourceCopy)
    Save-Bitmap $bmp $outPath
    $g.Dispose(); $bmp.Dispose()
}

function Find-TargetWindow {
    $windows = Get-WindowList
    if ($ProcessId -gt 0) {
        $w = $windows | Where-Object { $_.pid -eq $ProcessId } | Select-Object -First 1
        if ($w) { return $w }
    }
    if ($Title) {
        $w = $windows | Where-Object { $_.title -eq $Title } | Select-Object -First 1
        if ($w) { return $w }
    }
    if ($Query) {
        $w = $windows | Where-Object {
            $_.title -like "*$Query*" -or $_.process -like "*$Query*"
        } | Select-Object -First 1
        if ($w) { return $w }
    }
    return $null
}

switch ($Command) {
    'doctor' {
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        Write-Output "platform: windows"
        Write-Output "screen: $($screen.Width)x$($screen.Height)"
        Write-Output "windows_api: ok"
        Write-Output "screenshot: ok"
        $apps = @(Get-StartApps -ErrorAction SilentlyContinue).Count
        Write-Output "start_apps: $apps indexed"
    }
    'screen-info' {
        $s = [System.Windows.Forms.Screen]::PrimaryScreen
        $b = $s.Bounds
        Write-Output "primary: $($b.Width)x$($b.Height) @ ($($b.X),$($b.Y))"
        Write-Output "working_area: $($s.WorkingArea.Width)x$($s.WorkingArea.Height)"
        Write-Output "screens: $(([System.Windows.Forms.Screen]::AllScreens).Count)"
    }
    'list-windows' {
        $list = Get-WindowList | Select-Object -First $Limit
        if (-not $list) { Write-Output "No windows found."; break }
        foreach ($w in $list) {
            Write-Output "[$($w.pid)] $($w.process) | $($w.title)"
            Write-Output "  bounds: $($w.x),$($w.y) $($w.width)x$($w.height) hwnd=$($w.hwnd)"
        }
    }
    'find-window' {
        if (-not $Query -and -not $Title -and $ProcessId -le 0) { throw "find-window requires Query, Title, or ProcessId" }
        $matches = Get-WindowList
        if ($Query) {
            $matches = $matches | Where-Object { $_.title -like "*$Query*" -or $_.process -like "*$Query*" }
        }
        if ($Title) { $matches = $matches | Where-Object { $_.title -like "*$Title*" } }
        if ($ProcessId -gt 0) { $matches = $matches | Where-Object { $_.pid -eq $ProcessId } }
        $matches = $matches | Select-Object -First $Limit
        if (-not $matches) { Write-Output "No matching windows."; break }
        foreach ($w in $matches) {
            Write-Output "[$($w.pid)] $($w.process) | $($w.title)"
            Write-Output "  bounds: $($w.x),$($w.y) $($w.width)x$($w.height) hwnd=$($w.hwnd)"
        }
    }
    'focus-window' {
        $w = Find-TargetWindow
        if (-not $w) { throw "Window not found" }
        $hwnd = [IntPtr]::new($w.hwnd)
        [void][VisionWin32]::ShowWindow($hwnd, 9)
        [void][VisionWin32]::SetForegroundWindow($hwnd)
        Write-Output "Focused [$($w.pid)] $($w.process) | $($w.title)"
    }
    'capture-screen' {
        if (-not $Path) { throw "Path required" }
        $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        Capture-ScreenRegion $b.X $b.Y $b.Width $b.Height $Path
        Write-Output "Screenshot: $Path ($($b.Width)x$($b.Height))"
    }
    'capture-window' {
        if (-not $Path) { throw "Path required" }
        $w = Find-TargetWindow
        if (-not $w) { throw "Window not found" }
        Capture-ScreenRegion $w.x $w.y $w.width $w.height $Path
        Write-Output "Screenshot: $Path window=[$($w.pid)] $($w.title) $($w.width)x$($w.height)"
    }
    'capture-region' {
        if (-not $Path) { throw "Path required" }
        if ($Width -le 0 -or $Height -le 0) { throw "Width and Height required" }
        Capture-ScreenRegion $X $Y $Width $Height $Path
        Write-Output "Screenshot: $Path region=${X},${Y} ${Width}x${Height}"
    }
    'locate-app' {
        if (-not $Query) { throw "Query required" }
        Write-Output "## Running windows matching '$Query'"
        $running = Get-WindowList | Where-Object {
            $_.title -like "*$Query*" -or $_.process -like "*$Query*"
        } | Select-Object -First $Limit
        if ($running) {
            foreach ($w in $running) {
                Write-Output "RUN [$($w.pid)] $($w.process) | $($w.title)"
            }
        } else {
            Write-Output "(none)"
        }
        Write-Output ""
        Write-Output "## Installed (Start Menu) matching '$Query'"
        $installed = Get-StartApps -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -like "*$Query*"
        } | Select-Object -First $Limit
        if ($installed) {
            foreach ($a in $installed) {
                Write-Output "APP $($a.Name) | $($a.AppID)"
            }
        } else {
            Write-Output "(none)"
        }
    }
    'describe' {
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        Write-Output "=== Desktop vision ($($screen.Width)x$($screen.Height)) ==="
        Write-Output ""
        Write-Output "## Open windows (top $Limit)"
        $list = Get-WindowList | Select-Object -First $Limit
        foreach ($w in $list) {
            Write-Output "- [$($w.pid)] $($w.process): $($w.title) @ $($w.x),$($w.y) $($w.width)x$($w.height)"
        }
        if ($Path) {
            $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            Capture-ScreenRegion $b.X $b.Y $b.Width $b.Height $Path
            Write-Output ""
            Write-Output "Screenshot: $Path"
        }
    }
    default { throw "Unknown command: $Command" }
}