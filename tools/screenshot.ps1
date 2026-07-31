# Regenere les captures du README (.img/card.png et .img/dark.png) a partir de
# tools/screenshot.html, qui charge la carte reelle depuis dist/.
#
#   pwsh tools/screenshot.ps1
#
# Chrome doit etre installe ; -Chrome permet de pointer un autre binaire.
# La hauteur de fenetre est ajustee au nombre de stations du banc : si tu en
# ajoutes ou en retires dans screenshot.html, corrige -Height en consequence.

[CmdletBinding()]
param(
  [string] $Chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe",
  [int]    $Width  = 1360,
  [int]    $Height = 336
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$page = Join-Path $PSScriptRoot "screenshot.html"
$img  = Join-Path $root ".img"

if (-not (Test-Path $Chrome)) { throw "Chrome introuvable : $Chrome" }
if (-not (Test-Path $page))   { throw "Page de rendu introuvable : $page" }
if (-not (Test-Path $img))    { New-Item -ItemType Directory -Path $img | Out-Null }

$url  = "file:///" + ($page -replace '\\', '/')
$temp = Join-Path ([System.IO.Path]::GetTempPath()) "prix-carburant-shot"

# Les logos viennent de Wikimedia : `--virtual-time-budget` laisse le temps aux
# images d'arriver avant la capture, sinon la colonne logo sort vide.
$common = @(
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  "--force-device-scale-factor=2", "--virtual-time-budget=8000",
  "--window-size=$Width,$Height"
)

foreach ($shot in @(
  @{ File = "card.png"; Query = "";      Profile = "light" },
  @{ File = "dark.png"; Query = "?dark"; Profile = "dark"  }
)) {
  $out = Join-Path $img $shot.File
  # Surtout pas `$args` : variable automatique de PowerShell.
  $cliArgs = $common + @("--screenshot=$out", "--user-data-dir=$temp-$($shot.Profile)", "$url$($shot.Query)")
  Start-Process -FilePath $Chrome -ArgumentList $cliArgs -Wait
  if (Test-Path $out) {
    "{0} : {1:N0} octets" -f $shot.File, (Get-Item $out).Length
  } else {
    throw "Capture manquante : $out"
  }
}
