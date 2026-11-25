# Dot-source this script: . ./scripts/use-local-tools.ps1
$wilthyRoot = Split-Path -Parent $PSScriptRoot
$wilthyNodeVersion = (Get-Content -LiteralPath (Join-Path $wilthyRoot '.node-version') -Raw).Trim()
$wilthyPackageManager = (Get-Content -LiteralPath (Join-Path $wilthyRoot 'package.json') -Raw | ConvertFrom-Json).packageManager
$wilthyNodeDir = Join-Path $wilthyRoot ".tools/node-v$wilthyNodeVersion-win-x64"
$wilthyPnpmDir = Join-Path $wilthyRoot '.tools/package-manager/node_modules/@pnpm/exe.win32-x64'
if (!(Test-Path (Join-Path $wilthyNodeDir 'node.exe')) -or !(Test-Path (Join-Path $wilthyPnpmDir 'pnpm.exe'))) {
  throw "Local tools are missing. Install Node.js $wilthyNodeVersion and $wilthyPackageManager or follow README.md."
}
$env:PATH = "$wilthyNodeDir;$wilthyPnpmDir;" + $env:PATH
