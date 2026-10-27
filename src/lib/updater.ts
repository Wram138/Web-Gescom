import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { getCurrentVersion, compareVersions } from './version';

const execAsync = promisify(exec);

const UPDATE_INFO_FILE = path.join(process.cwd(), 'prisma', 'update_info.json');
const TEMP_DIR = path.join(process.cwd(), 'temp_update');
const ZIP_FILE = path.join(TEMP_DIR, 'update.zip');
const EXTRACT_DIR = path.join(TEMP_DIR, 'extracted');
const BAT_FILE = path.join(process.cwd(), 'apply-update.bat');

export interface UpdateInfo {
  hasUpdate: boolean;
  targetVersion?: string;
  downloadUrl?: string;
  mandatory?: boolean;
  notes?: string;
  commandedAt?: string;
}

export interface UpdateStatus {
  currentVersion: string;
  targetVersion?: string;
  hasUpdate: boolean;
  mandatory: boolean;
  notes?: string;
  downloadUrl?: string;
  isDownloading: boolean;
  readyToApply: boolean;
  downloadProgress: number; // 0 - 100
  error?: string | null;
}

// Estado em memória do download em andamento
let isDownloading = false;
let downloadProgress = 0;
let lastDownloadError: string | null = null;

export function getUpdateInfo(): UpdateInfo | null {
  try {
    if (fs.existsSync(UPDATE_INFO_FILE)) {
      const content = fs.readFileSync(UPDATE_INFO_FILE, 'utf8').replace(/^\uFEFF/, '');
      const data = JSON.parse(content);
      return data;
    }
  } catch (e) {
    console.error('Erro ao ler update_info.json:', e);
  }
  return null;
}

export function saveUpdateInfo(info: UpdateInfo): void {
  try {
    const dir = path.dirname(UPDATE_INFO_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(UPDATE_INFO_FILE, JSON.stringify(info, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar update_info.json:', e);
  }
}

export function clearUpdateInfo(): void {
  try {
    if (fs.existsSync(UPDATE_INFO_FILE)) {
      fs.unlinkSync(UPDATE_INFO_FILE);
    }
  } catch {}
}

export function getUpdateStatus(): UpdateStatus {
  const currentVersion = getCurrentVersion();
  const info = getUpdateInfo();

  let hasUpdate = false;
  let readyToApply = false;

  if (info && info.hasUpdate && info.targetVersion) {
    // Só considera que há atualização se a versão alvo for diferente da versão atual
    const cmp = compareVersions(info.targetVersion, currentVersion);
    if (cmp > 0 || (info.targetVersion !== currentVersion && info.downloadUrl)) {
      hasUpdate = true;
    }
  }

  // Verifica se o pacote descompactado já está pronto para aplicação
  if (fs.existsSync(EXTRACT_DIR)) {
    const hasNext = fs.existsSync(path.join(EXTRACT_DIR, '.next'));
    const hasServer = fs.existsSync(path.join(EXTRACT_DIR, 'server.js'));
    const hasVersion = fs.existsSync(path.join(EXTRACT_DIR, 'version.ini'));
    if (hasNext || hasServer || hasVersion) {
      readyToApply = true;
    }
  }

  return {
    currentVersion,
    targetVersion: info?.targetVersion,
    hasUpdate,
    mandatory: Boolean(info?.mandatory),
    notes: info?.notes,
    downloadUrl: info?.downloadUrl,
    isDownloading,
    readyToApply,
    downloadProgress,
    error: lastDownloadError,
  };
}

/**
 * Faz o download do pacote update.zip a partir da URL informada (GitHub Releases)
 * e descompacta em temp_update/extracted/
 */
export async function downloadUpdatePackage(overrideUrl?: string): Promise<{ success: boolean; message: string }> {
  const info = getUpdateInfo();
  const url = overrideUrl || info?.downloadUrl;

  if (!url) {
    throw new Error('Nenhuma URL de download informada.');
  }

  if (isDownloading) {
    return { success: true, message: 'Download já em andamento.' };
  }

  isDownloading = true;
  downloadProgress = 5;
  lastDownloadError = null;

  try {
    // 1. Limpa diretório temporário anterior se existir
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    // 2. Realiza o download via fetch com suporte a redirects (comum no GitHub Releases)
    downloadProgress = 15;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Web-Gescom-Updater/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao baixar atualização: HTTP ${response.status} ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get('content-length')) || 0;
    const fileStream = fs.createWriteStream(ZIP_FILE);

    if (!response.body) {
      throw new Error('Corpo da resposta HTTP vazio.');
    }

    // Leitura em chunks com cálculo de progresso
    // @ts-ignore
    const reader = response.body.getReader();
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fileStream.write(Buffer.from(value));
      receivedBytes += value.length;

      if (contentLength > 0) {
        const percent = Math.min(85, Math.round(15 + (receivedBytes / contentLength) * 70));
        downloadProgress = percent;
      }
    }

    await new Promise((resolve, reject) => {
      fileStream.end((err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    downloadProgress = 85;

    // 3. Descompacta o arquivo update.zip usando o Expand-Archive nativo do Windows
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    const psCommand = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '${ZIP_FILE}' -DestinationPath '${EXTRACT_DIR}' -Force"`;
    
    await execAsync(psCommand);

    downloadProgress = 95;

    // 4. PROTEÇÃO CRÍTICA DE BANCO DE DADOS E LICENÇA
    // Caso algum desavisado tenha incluído gescom.db ou license.json no ZIP, removemos sumariamente
    const forbiddenFiles = [
      path.join(EXTRACT_DIR, 'prisma', 'gescom.db'),
      path.join(EXTRACT_DIR, 'prisma', 'gescom.db-journal'),
      path.join(EXTRACT_DIR, 'prisma', 'license.json'),
      path.join(EXTRACT_DIR, 'prisma', 'clean_template.db'),
    ];

    for (const f of forbiddenFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
          console.warn(`[Updater] Arquivo proibido ${path.basename(f)} removido do pacote extraído para proteger dados locais.`);
        } catch {}
      }
    }

    // Remove o zip original para liberar espaço em disco
    try {
      if (fs.existsSync(ZIP_FILE)) fs.unlinkSync(ZIP_FILE);
    } catch {}

    downloadProgress = 100;
    isDownloading = false;

    return {
      success: true,
      message: 'Download e verificação da atualização concluídos com sucesso. Pronto para instalar!',
    };
  } catch (error: any) {
    isDownloading = false;
    downloadProgress = 0;
    lastDownloadError = error.message;
    console.error('Erro no download da atualização:', error);
    throw error;
  }
}

/**
 * Cria o script batch apply-update.bat, spawna ele de forma desacoplada
 * e finaliza o processo atual do Node.js para que as DLLs e executáveis
 * sejam substituídos sem bloqueio de arquivos do Windows.
 */
export async function applyUpdateAndRestart(): Promise<{ success: boolean; message: string }> {
  if (!fs.existsSync(EXTRACT_DIR)) {
    throw new Error('Nenhum pacote de atualização descompactado para instalar.');
  }

  // Conteúdo do script batch de substituição segura
  const batScript = `@echo off
chcp 65001 >nul
title Web-Gescom - Atualizando Sistema...
echo ========================================================
echo       Web-Gescom - Aplicando Atualizacao Over-The-Air
echo ========================================================
echo.
echo Aguardando encerramento do processo principal...
timeout /t 3 /nobreak >nul

set "APP_DIR=%~dp0"
set "EXTRACT_DIR=%APP_DIR%temp_update\\extracted"

if not exist "%EXTRACT_DIR%" (
    echo ERRO: Pasta de extracao nao encontrada: %EXTRACT_DIR%
    pause
    exit /b 1
)

:: Protecao critica: Garantir exclusao de qualquer banco ou licenca na pasta de extracao
if exist "%EXTRACT_DIR%\\prisma\\gescom.db" del /f /q "%EXTRACT_DIR%\\prisma\\gescom.db"
if exist "%EXTRACT_DIR%\\prisma\\license.json" del /f /q "%EXTRACT_DIR%\\prisma\\license.json"
if exist "%EXTRACT_DIR%\\prisma\\clean_template.db" del /f /q "%EXTRACT_DIR%\\prisma\\clean_template.db"

echo Copiando novos arquivos do sistema...
robocopy "%EXTRACT_DIR%" "%APP_DIR%" /E /XF gescom.db license.json clean_template.db /NDL /NFL /NJH /NJS

echo Limpando arquivos temporarios da instalacao...
rmdir /s /q "%APP_DIR%temp_update" >nul 2>&1
if exist "%APP_DIR%prisma\\update_info.json" del /f /q "%APP_DIR%prisma\\update_info.json" >nul 2>&1

echo.
echo ========================================================
echo   Web-Gescom atualizado com sucesso! Reiniciando...
echo ========================================================
timeout /t 1 /nobreak >nul

if exist "%APP_DIR%Web-Gescom.exe" (
    start "" "%APP_DIR%Web-Gescom.exe"
) else (
    if exist "%APP_DIR%runtime\\node.exe" (
        start "" "%APP_DIR%runtime\\node.exe" "%APP_DIR%server.js"
    ) else (
        start "" node "%APP_DIR%server.js"
    )
)

(goto) 2>nul & del "%~f0"
`;

  fs.writeFileSync(BAT_FILE, batScript, 'utf8');

  // Spawna o processo desanexado do CMD
  const subProcess = spawn('cmd.exe', ['/c', BAT_FILE], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });

  subProcess.unref();

  // Agenda encerramento do processo atual em 1.5s
  setTimeout(() => {
    process.exit(0);
  }, 1500);

  return {
    success: true,
    message: 'Sistema atualizado! O Web-Gescom será reiniciado em instantes com a nova versão.',
  };
}
