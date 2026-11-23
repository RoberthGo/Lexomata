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
    try {
        Copy-Item $portableExe $destPortable -Force -ErrorAction Stop
        Write-Host "    Copiado: $destPortable" -ForegroundColor Green
    } catch {
        $fallbackExe = Join-Path $ReleaseDir 'Lexomata-nuevo.exe'
        Copy-Item $portableExe $fallbackExe -Force
        Write-Host "    Aviso: Lexomata.exe está en uso; guardado como $fallbackExe" -ForegroundColor Yellow
    }
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
        Write-Host '    Compilando ABIs ARM (aarch64 + armv7) para compatibilidad móvil.' -ForegroundColor DarkGray
        npx tauri android build --apk --target aarch64 armv7
    }
    if ($LASTEXITCODE -ne 0) { throw 'Fallo tauri android build' }

    $apk = Get-ChildItem (Join-Path $Root 'src-tauri\gen\android\app\build\outputs\apk') -Recurse -Filter '*.apk' -ErrorAction SilentlyContinue |
        Sort-Object { if ($_.Name -like '*release*') { 0 } else { 1 } }, LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $apk) {
        throw 'No se encontró ningún archivo .apk generado en src-tauri/gen/android/app/build/outputs/apk.'
    }

    $destApk = Join-Path $ReleaseDir 'Lexomata.apk'
    if ($apk.Name -like '*unsigned*') {
        $buildToolsDir = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            Select-Object -First 1
        if (-not $buildToolsDir) {
            throw "No se encontró Android build-tools en $env:ANDROID_HOME\build-tools para firmar el APK."
        }
        $zipalign = Join-Path $buildToolsDir.FullName 'zipalign.exe'
        $apksigner = Join-Path $buildToolsDir.FullName 'apksigner.bat'
        $keystore = Join-Path $Root 'src-tauri\lexomata-release.keystore'
        if (-not (Test-Path $keystore)) {
            $keytool = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\keytool.exe' } else { 'keytool' }
            Write-Host '    Generando keystore local para firmar el APK...' -ForegroundColor Yellow
            & $keytool -genkeypair -v -keystore $keystore -storepass lexomata -keypass lexomata -alias lexomata -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Lexomata, OU=Dev, O=Lexomata, L=Local, ST=Local, C=MX' | Out-Null
            if ($LASTEXITCODE -ne 0) { throw 'Fallo keytool al generar keystore' }
        }
        $alignedApk = Join-Path $env:TEMP 'lexomata-aligned.apk'
        & $zipalign -p -f 4 $apk.FullName $alignedApk
        if ($LASTEXITCODE -ne 0) { throw 'Fallo zipalign' }
        & $apksigner sign --ks $keystore --ks-pass pass:lexomata --key-pass pass:lexomata --ks-key-alias lexomata --out $destApk $alignedApk
        if ($LASTEXITCODE -ne 0) { throw 'Fallo apksigner sign' }
        Remove-Item $alignedApk -Force -ErrorAction SilentlyContinue
        Remove-Item "$destApk.idsig" -Force -ErrorAction SilentlyContinue
        & $apksigner verify $destApk
        if ($LASTEXITCODE -ne 0) { throw 'Fallo apksigner verify' }
        Write-Host "    APK firmado y verificado: $destApk" -ForegroundColor Green
    } else {
        Copy-Item $apk.FullName $destApk -Force
        Write-Host "    Copiado: $destApk" -ForegroundColor Green
    }
}

Write-Host "==> Listo. Artefactos en $ReleaseDir" -ForegroundColor Green
Get-ChildItem $ReleaseDir | Format-Table Name, Length, LastWriteTime
