param(
  [ValidateSet("install", "dev", "test", "build", "test:sites", "preview")]
  [string]$Task = "dev",

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$TaskArguments
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node.exe -ErrorAction Stop | Select-Object -First 1
$nodeExecutable = $nodeCommand.Source

function Invoke-NodeCommand {
  param([string[]]$Arguments)

  & $nodeExecutable @Arguments
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

function Find-SystemNpmCli {
  $nodeCommands = Get-Command node.exe -All -ErrorAction SilentlyContinue
  foreach ($command in $nodeCommands) {
    $candidate = Join-Path (Split-Path -Parent $command.Source) "node_modules\npm\bin\npm-cli.js"
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "A readable system npm installation was not found beside node.exe. Reinstall Node.js, then run this command again."
}

Push-Location $projectRoot
try {
  $viteCli = Join-Path $projectRoot "node_modules\vite\bin\vite.js"

  switch ($Task) {
    "install" {
      $npmCli = Find-SystemNpmCli
      Invoke-NodeCommand -Arguments @($npmCli, "install", "--package-lock=false") + $TaskArguments
    }
    "dev" {
      if (-not (Test-Path -LiteralPath $viteCli)) {
        throw "Dependencies are missing. Run: .\scripts\project.ps1 install"
      }
      Invoke-NodeCommand -Arguments @($viteCli, "--host", "0.0.0.0", "--port", "4173", "--strictPort") + $TaskArguments
    }
    "test" {
      Invoke-NodeCommand -Arguments @(
        "--test",
        "tests/experience.test.mjs",
        "tests/scan.test.mjs",
        "tests/ocrScanner.test.mjs",
        "tests/library.test.mjs",
        "tests/learning.test.mjs"
      ) + $TaskArguments
    }
    "build" {
      if (-not (Test-Path -LiteralPath $viteCli)) {
        throw "Dependencies are missing. Run: .\scripts\project.ps1 install"
      }
      Invoke-NodeCommand -Arguments @($viteCli, "build") + $TaskArguments
      Invoke-NodeCommand -Arguments @("scripts/prepare-sites-build.mjs")
    }
    "test:sites" {
      Invoke-NodeCommand -Arguments @("--test", "tests/sites-worker.test.mjs") + $TaskArguments
    }
    "preview" {
      if (-not (Test-Path -LiteralPath $viteCli)) {
        throw "Dependencies are missing. Run: .\scripts\project.ps1 install"
      }
      Invoke-NodeCommand -Arguments @($viteCli, "preview", "--host", "0.0.0.0", "--port", "4173", "--strictPort") + $TaskArguments
    }
  }
}
finally {
  Pop-Location
}
