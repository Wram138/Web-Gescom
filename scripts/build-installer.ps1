# ========================================================
# Script de Criação do Instalador Profissional Web-Gescom
# ========================================================
$ErrorActionPreference = "Stop"

$RootDir = "c:\DEV\Web-Gescom"
$DistPackageDir = "$RootDir\dist-package"
$DistInstallerDir = "$RootDir\dist-installer"
$InnoCompiler = "C:\Users\admnrl\AppData\Local\Programs\Inno Setup 6\ISCC.exe"

Write-Host ">>> 1. Gerando banco de dados limpo para novos clientes..." -ForegroundColor Cyan
Set-Location $RootDir
node scripts/create-clean-db.js

Write-Host ">>> 2. Verificando build standalone..." -ForegroundColor Cyan
if (-not (Test-Path "$RootDir\.next\standalone\server.js")) {
    Write-Host "Compilando projeto Next.js standalone..." -ForegroundColor Yellow
    npm run build
}

Write-Host ">>> 3. Copiando arquivos estáticos para o standalone..." -ForegroundColor Cyan
if (Test-Path "$RootDir\.next\static") {
    Copy-Item -Path "$RootDir\.next\static" -Destination "$RootDir\.next\standalone\.next\" -Recurse -Force
}
if (Test-Path "$RootDir\public") {
    Copy-Item -Path "$RootDir\public" -Destination "$RootDir\.next\standalone\" -Recurse -Force
}

Write-Host ">>> 4. Preparando diretório de distribuição (dist-package)..." -ForegroundColor Cyan
if (Test-Path $DistPackageDir) {
    Remove-Item $DistPackageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $DistPackageDir -Force | Out-Null
New-Item -ItemType Directory -Path "$DistPackageDir\runtime" -Force | Out-Null
New-Item -ItemType Directory -Path "$DistPackageDir\prisma" -Force | Out-Null
New-Item -ItemType Directory -Path "$DistPackageDir\Icon" -Force | Out-Null

# Copiar arquivos do standalone
Write-Host "Copiando arquivos do standalone..." -ForegroundColor Gray
Copy-Item -Path "$RootDir\.next\standalone\*" -Destination $DistPackageDir -Recurse -Force

# Garantir runtime Node.js portátil
Write-Host "Copiando Node.js runtime portátil..." -ForegroundColor Gray
Copy-Item -Path "C:\Program Files\nodejs\node.exe" -Destination "$DistPackageDir\runtime\node.exe" -Force

# Copiar executável e recursos
Write-Host "Copiando executável Web-Gescom.exe e ícones..." -ForegroundColor Gray
Copy-Item -Path "$RootDir\Web-Gescom.exe" -Destination "$DistPackageDir\Web-Gescom.exe" -Force
Copy-Item -Path "$RootDir\Icon\*" -Destination "$DistPackageDir\Icon\" -Recurse -Force
Copy-Item -Path "$RootDir\version.ini" -Destination "$DistPackageDir\version.ini" -Force
Copy-Item -Path "$RootDir\Fazer-Backup.bat" -Destination "$DistPackageDir\Fazer-Backup.bat" -Force

# Copiar prisma schema e banco limpo (remover qualquer banco de desenvolvimento)
Write-Host "Configurando schema e banco limpo..." -ForegroundColor Gray
if (Test-Path "$DistPackageDir\prisma\gescom.db") {
    Remove-Item "$DistPackageDir\prisma\gescom.db" -Force
}
if (Test-Path "$DistPackageDir\prisma\license.json") {
    Remove-Item "$DistPackageDir\prisma\license.json" -Force
}
Copy-Item -Path "$RootDir\prisma\schema.prisma" -Destination "$DistPackageDir\prisma\schema.prisma" -Force
Copy-Item -Path "$RootDir\prisma\clean_template.db" -Destination "$DistPackageDir\prisma\clean_template.db" -Force

# Criar pasta de saída do instalador
if (-not (Test-Path $DistInstallerDir)) {
    New-Item -ItemType Directory -Path $DistInstallerDir -Force | Out-Null
}

Write-Host ">>> 5. Compilando o Instalador EXE com Inno Setup..." -ForegroundColor Cyan
& $InnoCompiler "$RootDir\installer.iss"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  SUCESSO! Instalador gerado com sucesso em:" -ForegroundColor Green
    Write-Host "  $DistInstallerDir\Instalador-Web-Gescom-v1.0.exe" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "Falha na compilação do instalador Inno Setup." -ForegroundColor Red
}
