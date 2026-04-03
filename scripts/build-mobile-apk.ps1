$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$jdkHome = "c:\Users\ROG\Documents\ReactJs\_buildtools\jdk21\jdk-21.0.10+7"
$androidSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$apkSource = Join-Path $projectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
$apkOutputDir = Join-Path $projectRoot "mobile-builds"
$apkOutput = Join-Path $apkOutputDir "POS-debug.apk"

if (!(Test-Path $jdkHome)) {
  throw "Portable JDK 21 was not found at $jdkHome"
}

if (!(Test-Path $androidSdk)) {
  throw "Android SDK was not found at $androidSdk"
}

$env:JAVA_HOME = $jdkHome
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk

Push-Location $projectRoot
try {
  & npm run mobile:sync
  if ($LASTEXITCODE -ne 0) {
    throw "npm run mobile:sync failed."
  }

  Push-Location (Join-Path $projectRoot "android")
  try {
    & .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) {
      throw "Gradle assembleDebug failed."
    }
  } finally {
    Pop-Location
  }

  New-Item -ItemType Directory -Force -Path $apkOutputDir | Out-Null
  Copy-Item $apkSource $apkOutput -Force
  Write-Host "APK ready at $apkOutput"
} finally {
  Pop-Location
}
