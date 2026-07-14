param(
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$siteUrl = "https://htv9tby87g-sketch.github.io/kaoyan-news-site/"
$logFile = Join-Path $repoRoot "local-catchup.log"
$mutex = New-Object System.Threading.Mutex($false, "Local\KaoyanNewsCatchup")
$hasLock = $false

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
}

try {
  if ($OpenBrowser) {
    Start-Process $siteUrl
  }

  $hasLock = $mutex.WaitOne(0)
  if (-not $hasLock) {
    Write-Log "Another recovery check is already running."
    exit 0
  }

  Set-Location $repoRoot
  $env:GIT_TERMINAL_PROMPT = "0"
  $env:GCM_INTERACTIVE = "Never"

  & git -c http.proxy= -c https.proxy= pull --rebase origin main 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "git pull failed" }

  & node generate-report.mjs --backfill --days 14 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) { throw "news recovery failed" }

  & git add -A -- published-data/news published-data/images
  & git diff --cached --quiet
  if ($LASTEXITCODE -eq 1) {
    & git -c user.name="kaoyan-news-local" -c user.email="local@kaoyan-news.invalid" commit -m "chore: recover missing news archive" 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) { throw "git commit failed" }

    & git -c http.proxy= -c https.proxy= pull --rebase origin main 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) { throw "git rebase failed" }
    & git -c http.proxy= -c https.proxy= push origin main 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) { throw "git push failed" }
    Write-Log "Missing reports were pushed successfully."
  } elseif ($LASTEXITCODE -eq 0) {
    Write-Log "No released reports are missing."
  } else {
    throw "git diff failed"
  }
} catch {
  Write-Log "Recovery failed: $($_.Exception.Message)"
  exit 1
} finally {
  if ($hasLock) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
