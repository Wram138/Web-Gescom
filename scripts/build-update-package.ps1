<#
.SYNOPSIS
    Gera o pacote limpo de atualização Over-The-Air (update.zip) para GitHub Releases.
.PARAMETER Version
    Versão alvo para a atualização (ex: "1.0.1"). Se não fornecido, lê de version.ini.
.EXAMPLE
    .\scripts\build-update-package.ps1 -Version "1.0.1"
#>
param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$RootDir = "c:\DEV\Web-Gescom"
$DistUpdateDir = "$RootDir\dist-update"
$StagingDir = "$DistUpdateDir\staging"
$ZipFile = "$DistUpdateDir\update.zip"

Set-Location $RootDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "    Web-Gescom - Gerador de Pacote de Atualização (OTA)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Atualizar ou ler versão
if ($Version -ne "") {
    Write-Host ">>> Atualizando version.ini, version.json e package.json para versao v$Version..." -ForegroundColor Yellow
    $nodeScript = @"
const fs = require('fs');
const v = process.argv[1];

const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, ''));
pkg.version = v;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const vJsonPath = 'src/lib/version.json';
let vData = { version: v, build: 1, updatedAt: new Date().toISOString() };
if (fs.existsSync(vJsonPath)) {
    try { vData = JSON.parse(fs.readFileSync(vJsonPath, 'utf8')); } catch(e) {}
}
vData.version = v;
vData.build = (vData.build || 0) + 1;
vData.updatedAt = new Date().toISOString();
fs.writeFileSync(vJsonPath, JSON.stringify(vData, null, 2) + '\n', 'utf8');

const iniContent = '[Version]\nVersion=' + v + '\nBuild=' + vData.build + '\nUpdatedAt=' + vData.updatedAt + '\n';
fs.writeFileSync('version.ini', iniContent, 'utf8');
"@
    node -e $nodeScript $Version
} else {
    $iniContent = Get-Content "$RootDir\version.ini" -Raw
    if ($iniContent -match 'Version=([^\r\n]+)') {
        $Version = $matches[1].Trim()
    } else {
        $Version = "1.0.1"
    }
}

Write-Host "Versão do Pacote: v$Version" -ForegroundColor Green

# 2. Compilar projeto Next.js standalone
Write-Host ">>> 2. Compilando o build standalone do Next.js..." -ForegroundColor Cyan
npm run build

if (-not (Test-Path "$RootDir\.next\standalone\server.js")) {
    Write-Error "Falha: .next\standalone\server.js não foi encontrado após o build."
}

# 3. Preparar diretório de staging limpo
Write-Host ">>> 3. Preparando arquivos limpos em staging..." -ForegroundColor Cyan
if (Test-Path $DistUpdateDir) {
    Remove-Item $DistUpdateDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

# Copia arquivos standalone
Write-Host "Copiando arquivos do standalone..." -ForegroundColor Gray
Copy-Item -Path "$RootDir\.next\standalone\*" -Destination $StagingDir -Recurse -Force

# Copia arquivos estáticos indispensáveis (.next\static e public)
Write-Host "Copiando arquivos estáticos (.next/static e public)..." -ForegroundColor Gray
if (Test-Path "$RootDir\.next\static") {
    if (-not (Test-Path "$StagingDir\.next\static")) {
        New-Item -ItemType Directory -Path "$StagingDir\.next\static" -Force | Out-Null
    }
    Copy-Item -Path "$RootDir\.next\static\*" -Destination "$StagingDir\.next\static\" -Recurse -Force
}
if (Test-Path "$RootDir\public") {
    if (-not (Test-Path "$StagingDir\public")) {
        New-Item -ItemType Directory -Path "$StagingDir\public" -Force | Out-Null
    }
    Copy-Item -Path "$RootDir\public\*" -Destination "$StagingDir\public\" -Recurse -Force
}

# Copia arquivos de versão e schema
Copy-Item -Path "$RootDir\version.ini" -Destination "$StagingDir\version.ini" -Force
if (-not (Test-Path "$StagingDir\prisma")) {
    New-Item -ItemType Directory -Path "$StagingDir\prisma" -Force | Out-Null
}
Copy-Item -Path "$RootDir\prisma\schema.prisma" -Destination "$StagingDir\prisma\schema.prisma" -Force

# 4. PROTEÇÃO ABSOLUTA DE DADOS DO CLIENTE
Write-Host ">>> 4. Verificação de Segurança (Garantindo ausência de bancos de dados)..." -ForegroundColor Cyan
$forbidden = @(
    "$StagingDir\prisma\gescom.db",
    "$StagingDir\prisma\gescom.db-journal",
    "$StagingDir\prisma\license.json",
    "$StagingDir\prisma\clean_template.db"
)
foreach ($f in $forbidden) {
    if (Test-Path $f) {
        Remove-Item $f -Force
        Write-Host "Removido arquivo restrito: $f" -ForegroundColor Red
    }
}

# 5. Compactar para update.zip
Write-Host ">>> 5. Gerando arquivo compactado update.zip..." -ForegroundColor Cyan
Compress-Archive -Path "$StagingDir\*" -DestinationPath $ZipFile -CompressionLevel Optimal -Force

# Limpa pasta de staging
Remove-Item $StagingDir -Recurse -Force

# 6. Informações e Próximos Passos
$zipInfo = Get-Item $ZipFile
$sizeMb = [math]::Round($zipInfo.Length / 1MB, 2)
$hash = (Get-FileHash -Path $ZipFile -Algorithm SHA256).Hash

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  PACOTE DE ATUALIZAÇÃO GERADO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Arquivo: $ZipFile" -ForegroundColor Yellow
Write-Host "Versão:  v$Version" -ForegroundColor Yellow
Write-Host "Tamanho: $sizeMb MB" -ForegroundColor Yellow
Write-Host "SHA-256: $hash" -ForegroundColor Gray
Write-Host ""
Write-Host "INSTRUÇÕES PARA PUBLICAR NO GITHUB E COMANDAR NO SERVIDOR:" -ForegroundColor Cyan
Write-Host "1. Acesse https://github.com/Wram138/Web-Gescom/releases/new" -ForegroundColor White
Write-Host "2. Crie uma nova Release:" -ForegroundColor White
Write-Host "   - Tag version:   v$Version" -ForegroundColor Gray
Write-Host "   - Release title: Web-Gescom v$Version" -ForegroundColor Gray
Write-Host "   - Anexe o arquivo: $ZipFile" -ForegroundColor Yellow
Write-Host "3. Publique a Release no GitHub." -ForegroundColor White
Write-Host "4. Copie o link do asset update.zip publicado" -ForegroundColor Gray
Write-Host "5. No Serv-Gescom VPS (https://valida.alecrim.tec.br ou IP:1806):" -ForegroundColor White
Write-Host "   - Acesse a aba Atualizacoes Remotas (OTA)" -ForegroundColor Gray
Write-Host "   - Preencha Versao Alvo (v$Version) e o link direto do update.zip" -ForegroundColor Gray
Write-Host "   - Clique no botao Comandar Atualizacao Global" -ForegroundColor Green
Write-Host "   Pronto! Todos os computadores baixarao a versao sem apagar o banco." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
