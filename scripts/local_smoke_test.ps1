$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
$logsDir = Join-Path $root "local-logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$mlOut = Join-Path $logsDir "ml.inline.out.log"
$mlErr = Join-Path $logsDir "ml.inline.err.log"
$beOut = Join-Path $logsDir "backend.inline.out.log"
$beErr = Join-Path $logsDir "backend.inline.err.log"

Remove-Item $mlOut, $mlErr, $beOut, $beErr -ErrorAction SilentlyContinue

$ml = $null
$be = $null

function Read-WebErrorBody($ErrorRecord) {
  if ($ErrorRecord.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($ErrorRecord.Exception.Response.GetResponseStream())
    return $reader.ReadToEnd()
  }

  return ($ErrorRecord | Out-String)
}

try {
  $ml = Start-Process `
    -FilePath "C:\Users\jerem\AppData\Local\Programs\Python\Python312\python.exe" `
    -ArgumentList "app.py" `
    -WorkingDirectory (Join-Path $root "ml-service") `
    -RedirectStandardOutput $mlOut `
    -RedirectStandardError $mlErr `
    -PassThru

  $be = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm.cmd start" `
    -WorkingDirectory (Join-Path $root "backend") `
    -RedirectStandardOutput $beOut `
    -RedirectStandardError $beErr `
    -PassThru

  Start-Sleep -Seconds 5

  Write-Output "--- health ---"
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:5002/api/health" -Method Get | ConvertTo-Json -Compress
  } catch {
    Write-Output "ML health failed"
    Write-Output (Read-WebErrorBody $_)
  }

  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:5003/api/health" -Method Get | ConvertTo-Json -Compress
  } catch {
    Write-Output "Backend health failed"
    Write-Output (Read-WebErrorBody $_)
  }

  Write-Output "--- voice speak ---"
  try {
    Invoke-RestMethod `
      -Uri "http://127.0.0.1:5002/api/ml/voice/speak" `
      -Method Post `
      -ContentType "application/json" `
      -Body '{"text":"test voice"}' | ConvertTo-Json -Depth 8
  } catch {
    Write-Output (Read-WebErrorBody $_)
  }

  Write-Output "--- ml predict ---"
  try {
    Invoke-RestMethod `
      -Uri "http://127.0.0.1:5002/api/ml/predict/all" `
      -Method Post `
      -ContentType "application/json" `
      -Body '{"classes":{"currently_active":[],"starting_soon":[],"recently_ended":[]},"weather_multiplier":1,"permit_id":"gold","meta":{"request_id":"local_test","request_source":"manual","campus_query_time":"12:00"}}' | ConvertTo-Json -Depth 8
  } catch {
    Write-Output (Read-WebErrorBody $_)
  }

  Write-Output "--- backend predict ---"
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:5003/api/predict/all?permit=gold" -Method Get | ConvertTo-Json -Depth 8
  } catch {
    Write-Output (Read-WebErrorBody $_)
  }

  Write-Output "--- ml stdout ---"
  Get-Content $mlOut | Select-Object -Last 80

  Write-Output "--- ml stderr ---"
  Get-Content $mlErr | Select-Object -Last 80

  Write-Output "--- backend stdout ---"
  Get-Content $beOut | Select-Object -Last 80

  Write-Output "--- backend stderr ---"
  Get-Content $beErr | Select-Object -Last 80
}
finally {
  if ($ml) {
    Stop-Process -Id $ml.Id -Force -ErrorAction SilentlyContinue
  }

  if ($be) {
    Stop-Process -Id $be.Id -Force -ErrorAction SilentlyContinue
  }
}
