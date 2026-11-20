$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$player = Join-Path $projectRoot 'release-desktop\win-unpacked\CodexLegend.exe'
$data = Join-Path (Split-Path $player -Parent) 'resources\app.asar'
if (!(Test-Path -LiteralPath $player -PathType Leaf) -or !(Test-Path -LiteralPath $data -PathType Leaf)) { throw 'The packaged executable and resources do not exist. No shortcut was created.' }
$desktopFolder = [Environment]::GetFolderPath('DesktopDirectory')
$shortcutPath = Join-Path $desktopFolder 'Codex Legend.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $player
$shortcut.WorkingDirectory = Split-Path $player -Parent
$shortcut.IconLocation = "$player,0"
$shortcut.Description = 'Codex Legend offline game'
$shortcut.Save()
$verified = $shell.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ne $player -or $verified.WorkingDirectory -ne (Split-Path $player -Parent) -or $verified.IconLocation -ne "$player,0") { throw 'Shortcut target, working directory or icon verification failed.' }
[ordered]@{ at = (Get-Date).ToUniversalTime().ToString('o'); path = $shortcutPath; target = $verified.TargetPath; workingDirectory = $verified.WorkingDirectory; icon = $verified.IconLocation; verified = $true } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $projectRoot 'docs\desktop\evidence\shortcut.json') -Encoding UTF8
Write-Output "Created and verified: $shortcutPath"
