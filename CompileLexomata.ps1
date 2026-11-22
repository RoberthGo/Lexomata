param(
    [switch]$SkipExe,
    [switch]$SkipApk,
    [switch]$AllAndroidAbis
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$ReleaseDir = Join-Path $Root 'release'
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

# Configurar JAVA_HOME si no está definido
if (-not $env:JAVA_HOME) {
    $jdk = Get-ChildItem 'C:\Program Files\Java' -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'jdk-*' } |
        Sort-Object Name -Descending |
        Select-Object -First 1
    if ($jdk) {
        $env:JAVA_HOME = $jdk.FullName
    }
}

# Configurar ANDROID_HOME / NDK_HOME si no están definidos
if (-not $env:ANDROID_HOME -and (Test-Path "$env:LOCALAPPDATA\Android\Sdk")) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}
if (-not $env:NDK_HOME -and $env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\ndk")) {
    $ndk = Get-ChildItem "$env:ANDROID_HOME\ndk" -Directory |
        Sort-Object Name -Descending |
        Select-Object -First 1
    if ($ndk) {
        $env:NDK_HOME = $ndk.FullName
    }
}

Write-Host '==> [1/3] Compilando motor Rust/WASM y frontend web...' -ForegroundColor Cyan
npm run wasm:build
if ($LASTEXITCODE -ne 0) { throw 'Fallo wasm:build' }

npm run build:web
if ($LASTEXITCODE -ne 0) { throw 'Fallo build:web' }

$WebDist = Join-Path $Root 'apps\web\dist'
$ReleaseWeb = Join-Path $ReleaseDir 'web'
if (Test-Path $ReleaseWeb) { Remove-Item $ReleaseWeb -Recurse -Force }
Copy-Item $WebDist $ReleaseWeb -Recurse -Force
$WebZip = Join-Path $ReleaseDir 'Lexomata-web.zip'
Compress-Archive -Path "$WebDist\*" -DestinationPath $WebZip -Force
Write-Host "    Copiado web: $ReleaseWeb y $WebZip" -ForegroundColor Green

if (-not $SkipExe) {
    Write-Host '==> [2/3] Compilando aplicación Windows (.exe)...' -ForegroundColor Cyan
    npx tauri build --no-bundle
    if ($LASTEXITCODE -ne 0) { throw 'Fallo tauri build (Windows)' }

    $portableExe = Join-Path $Root 'src-tauri\target\release\lexomata-desktop.exe'
    if (-not (Test-Path $portableExe)) {
        throw 'No se encontró src-tauri\target\release\lexomata-desktop.exe'
    }
    $destPortable = Join-Path $ReleaseDir 'Lexomata.exe'
    Copy-Item $portableExe $destPortable -Force
    Write-Host "    Copiado: $destPortable" -ForegroundColor Green
}

if (-not $SkipApk) {
    Write-Host '==> [3/3] Compilando aplicación Android (.apk)...' -ForegroundColor Cyan
    if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
        throw "No se encontró ANDROID_HOME ($env:ANDROID_HOME). Instala Android SDK."
    }
    if (-not $env:NDK_HOME -or -not (Test-Path $env:NDK_HOME)) {
        throw "No se encontró Android NDK en $env:ANDROID_HOME\ndk. Instálalo desde Android Studio -> SDK Manager -> SDK Tools -> NDK (Side by side)."
    }

    if (-not (Test-Path (Join-Path $Root 'src-tauri\gen\android'))) {
        Write-Host '    Inicializando proyecto Android de Tauri...' -ForegroundColor Yellow
        npx tauri android init
        if ($LASTEXITCODE -ne 0) { throw 'Fallo tauri android init' }
    }

    $gradleProps = Join-Path $Root 'src-tauri\gen\android\gradle.properties'
    if (Test-Path $gradleProps) {
        $propsContent = Get-Content $gradleProps -Raw
        if ($propsContent -notmatch 'android\.overridePathCheck=true') {
            Add-Content -Path $gradleProps -Value "`nandroid.overridePathCheck=true"
        }
    }

    $buildTask = Join-Path $Root 'src-tauri\gen\android\buildSrc\src\main\java\io\github\roberthg\lexomata\kotlin\BuildTask.kt'
    if (Test-Path $buildTask) {
        $taskContent = Get-Content $buildTask -Raw
        if ($taskContent -match 'val executable = """npm""";') {
            Set-Content -Path $buildTask -Value ($taskContent -replace 'val executable = """npm""";', 'val executable = """npm.cmd""";') -NoNewline
        }
    }

    if ($AllAndroidAbis) {
        npx tauri android build --apk
    } else {
        Write-Host '    Compilando ABI arm64 (aarch64) para compilación rápida. Usa -AllAndroidAbis para las 4 arquitecturas.' -ForegroundColor DarkGray
        npx tauri android build --apk --target aarch64
    }
    if ($LASTEXITCODE -ne 0) { throw 'Fallo tauri android build' }

    $apk = Get-ChildItem (Join-Path $Root 'src-tauri\gen\android\app\build\outputs\apk') -Recurse -Filter '*.apk' -ErrorAction SilentlyContinue |
        Sort-Object { if ($_.Name -like '*release*') { 0 } else { 1 } }, LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $apk) {
        throw 'No se encontró ningún archivo .apk generado en src-tauri/gen/android/app/build/outputs/apk.'
    }

    $destApk = Join-Path $ReleaseDir 'Lexomata.apk'
    Copy-Item $apk.FullName $destApk -Force
    Write-Host "    Copiado: $destApk" -ForegroundColor Green
}

Write-Host "==> Listo. Artefactos en $ReleaseDir" -ForegroundColor Green
Get-ChildItem $ReleaseDir | Format-Table Name, Length, LastWriteTime
