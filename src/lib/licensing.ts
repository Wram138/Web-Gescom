import fs from 'fs';
import path from 'path';

const LICENSE_FILE = path.join(process.cwd(), 'prisma', 'license.json');

// Endereço oficial e fixo do servidor de validação VPS
export const OFFICIAL_LICENSE_SERVER = process.env.LICENSE_SERVER_OVERRIDE || 'https://valida.alecrim.tec.br';

export interface LicenseData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  phone?: string;
  vpsUrl: string;
  status: 'LIBERADO' | 'BLOQUEADO' | 'PENDENTE' | 'NAO_LICENCIADO';
  lastServerContact: string | null;
  lastCheckAttempt: string | null;
  lastBlockReason: string | null;
  signature?: string;
}

export interface LicenseStatusResult {
  isBlocked: boolean;
  status: 'LIBERADO' | 'BLOQUEADO' | 'TOLERANCIA_OFFLINE' | 'PENDENTE' | 'NAO_LICENCIADO';
  reason?: string;
  daysOffline: number;
  daysRemaining: number;
  lastContactDate: string | null;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  vpsUrl: string;
}

// Configuração inicial quando o sistema é instalado do zero
const DEFAULT_LICENSE: LicenseData = {
  cnpj: '',
  razaoSocial: '',
  nomeFantasia: '',
  phone: '',
  vpsUrl: OFFICIAL_LICENSE_SERVER,
  status: 'NAO_LICENCIADO',
  lastServerContact: null,
  lastCheckAttempt: null,
  lastBlockReason: null,
};

export function getLicenseConfig(): LicenseData {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      const content = fs.readFileSync(LICENSE_FILE, 'utf8');
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_LICENSE,
        ...parsed,
        vpsUrl: OFFICIAL_LICENSE_SERVER, // Força sempre o endereço oficial valida.alecrim.tec.br
      };
    }
  } catch (e) {
    console.error('Erro ao ler license.json:', e);
  }

  // Cria o arquivo com os valores padrão diretamente
  try {
    const dir = path.dirname(LICENSE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(DEFAULT_LICENSE, null, 2), 'utf8');
  } catch {}

  return DEFAULT_LICENSE;
}

export function saveLicenseConfig(data: Partial<LicenseData>): LicenseData {
  let current: LicenseData = DEFAULT_LICENSE;
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      current = { ...DEFAULT_LICENSE, ...JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8')) };
    }
  } catch {}

  const updated: LicenseData = {
    ...current,
    ...data,
    vpsUrl: OFFICIAL_LICENSE_SERVER, // Garante que a URL não é adulterada
  };

  try {
    const dir = path.dirname(LICENSE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar license.json:', e);
  }

  return updated;
}

/**
 * Avalia o status atual da licença localmente aplicando a regra dos 5 dias de tolerância
 */
export function evaluateLicenseLocal(): LicenseStatusResult {
  const config = getLicenseConfig();
  const now = Date.now();

  // Caso 1: Sistema zerado / recém instalado (nenhum CNPJ inserido ainda)
  if (!config.cnpj || config.status === 'NAO_LICENCIADO') {
    return {
      isBlocked: true,
      status: 'NAO_LICENCIADO',
      reason: 'Sistema não licenciado. Insira o CNPJ da empresa para solicitar a liberação de acesso.',
      daysOffline: 0,
      daysRemaining: 0,
      lastContactDate: null,
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      vpsUrl: OFFICIAL_LICENSE_SERVER,
    };
  }

  // Caso 2: Solicitação já enviada, aguardando aprovação na VPS
  if (config.status === 'PENDENTE') {
    return {
      isBlocked: true,
      status: 'PENDENTE',
      reason: 'Solicitação de licença enviada ao servidor. Aguardando aprovação e liberação pelo administrador.',
      daysOffline: 0,
      daysRemaining: 0,
      lastContactDate: null,
      cnpj: config.cnpj,
      razaoSocial: config.razaoSocial,
      nomeFantasia: config.nomeFantasia,
      vpsUrl: OFFICIAL_LICENSE_SERVER,
    };
  }

  // Caso 3: Bloqueado explicitamente pelo servidor por inadimplência
  if (config.status === 'BLOQUEADO') {
    return {
      isBlocked: true,
      status: 'BLOQUEADO',
      reason: config.lastBlockReason || 'Sistema suspenso por pendência financeira. Regularize sua mensalidade para reativação imediata.',
      daysOffline: 0,
      daysRemaining: 0,
      lastContactDate: config.lastServerContact,
      cnpj: config.cnpj,
      razaoSocial: config.razaoSocial,
      nomeFantasia: config.nomeFantasia,
      vpsUrl: OFFICIAL_LICENSE_SERVER,
    };
  }

  // Caso 4: Se o status era liberado mas nunca houve registro de contato
  if (!config.lastServerContact) {
    return {
      isBlocked: true,
      status: 'BLOQUEADO',
      reason: 'Primeira execução requer conexão com a internet para validar a licença.',
      daysOffline: 999,
      daysRemaining: 0,
      lastContactDate: null,
      cnpj: config.cnpj,
      razaoSocial: config.razaoSocial,
      nomeFantasia: config.nomeFantasia,
      vpsUrl: OFFICIAL_LICENSE_SERVER,
    };
  }

  const lastContactMs = new Date(config.lastServerContact).getTime();
  const diffMs = now - lastContactMs;

  // Detecção de fraude de relógio (retroceder data do Windows)
  if (diffMs < -60000) {
    return {
      isBlocked: true,
      status: 'BLOQUEADO',
      reason: 'Inconsistência no relógio do sistema (data anterior ao último contato registrado). Ajuste a data e hora do Windows e sincronize online.',
      daysOffline: 0,
      daysRemaining: 0,
      lastContactDate: config.lastServerContact,
      cnpj: config.cnpj,
      razaoSocial: config.razaoSocial,
      nomeFantasia: config.nomeFantasia,
      vpsUrl: OFFICIAL_LICENSE_SERVER,
    };
  }

  const daysOffline = diffMs / (1000 * 60 * 60 * 24);
  const TOLERANCE_DAYS = 5;

  // Regra de tolerância máxima de 5 dias offline
  if (daysOffline > TOLERANCE_DAYS) {
    return {
      isBlocked: true,
      status: 'BLOQUEADO',
      reason: `O sistema está há ${Math.floor(daysOffline)} dias sem contato com o servidor de licença (limite de tolerância: 5 dias). Conecte este computador à internet para validar a licença e liberar o acesso.`,
      daysOffline: Math.floor(daysOffline),
      daysRemaining: 0,
      lastContactDate: config.lastServerContact,
      cnpj: config.cnpj,
      razaoSocial: config.razaoSocial,
      nomeFantasia: config.nomeFantasia,
      vpsUrl: OFFICIAL_LICENSE_SERVER,
    };
  }

  // Operação normal com tolerância offline
  if (daysOffline > 0.5) {
    return {
      isBlocked: false,
      status: 'TOLERANCIA_OFFLINE',
      daysOffline: Math.floor(daysOffline),
      daysRemaining: Math.max(0, Math.ceil(TOLERANCE_DAYS - daysOffline)),
      lastContactDate: config.lastServerContact,
      cnpj: config.cnpj,
      razaoSocial: config.razaoSocial,
      nomeFantasia: config.nomeFantasia,
      vpsUrl: OFFICIAL_LICENSE_SERVER,
    };
  }

  return {
    isBlocked: false,
    status: 'LIBERADO',
    daysOffline: 0,
    daysRemaining: TOLERANCE_DAYS,
    lastContactDate: config.lastServerContact,
    cnpj: config.cnpj,
    razaoSocial: config.razaoSocial,
    nomeFantasia: config.nomeFantasia,
    vpsUrl: OFFICIAL_LICENSE_SERVER,
  };
}

/**
 * Garante que a licença está ativa antes de executar operações sensíveis no banco
 */
export function assertLicenseValid(): void {
  const result = evaluateLicenseLocal();
  if (result.isBlocked) {
    throw new Error(result.reason || 'Sistema bloqueado por licença ou pendência financeira.');
  }
}

/**
 * Helper inteligente para comunicação com o servidor de validação na porta 1806.
 * Suporta fallback transparente entre HTTP e HTTPS caso haja ou não certificado SSL na porta.
 */
async function callLicenseApi(
  apiPath: string,
  body: any,
  timeoutMs = 7000
): Promise<{ ok: boolean; status: number; data: any }> {
  // Se houver override explícito de ambiente (ex: testes locais)
  if (process.env.LICENSE_SERVER_OVERRIDE) {
    const target = `${process.env.LICENSE_SERVER_OVERRIDE.replace(/\/$/, '')}${apiPath}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  // Tenta conectar em https://valida.alecrim.tec.br (porta 443 com SSL Cloudflare/Nginx)
  // e mantém fallbacks para portas alternativas caso necessário
  const candidateUrls = [
    `https://valida.alecrim.tec.br${apiPath}`,
    `http://valida.alecrim.tec.br${apiPath}`,
    `http://valida.alecrim.tec.br:1806${apiPath}`,
    `https://valida.alecrim.tec.br:1806${apiPath}`,
  ];

  let lastError: any = null;

  for (const targetUrl of candidateUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      // Tenta próximo protocolo caso ocorra falha de conexão ou erro de SSL
      continue;
    }
  }

  throw lastError || new Error('Não foi possível conectar ao servidor valida.alecrim.tec.br');
}

/**
 * Envia uma solicitação de ativação de licença para a VPS (Primeira abertura)
 */
export async function requestLicenseActivation({
  cnpj,
  razaoSocial,
  nomeFantasia,
  phone,
}: {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  phone?: string;
}): Promise<{ success: boolean; status: string; message: string }> {
  try {
    const { ok, status, data } = await callLicenseApi('/api/license/request', {
      cnpj,
      razaoSocial,
      nomeFantasia,
      phone,
      systemVersion: 'Web-Gescom v1.0.0 (Porta 1806)',
    });

    if (ok) {
      // Atualiza também o banco de dados do sistema em segundo plano
      try {
        const prisma = (await import('@/lib/prisma')).default;
        await prisma.systemSetting.upsert({
          where: { id: 'config_padrao' },
          update: {
            cnpj,
            razaoSocial,
            storeName: nomeFantasia || razaoSocial,
          },
          create: {
            id: 'config_padrao',
            cnpj,
            razaoSocial,
            storeName: nomeFantasia || razaoSocial,
          },
        });
      } catch {}

      if (data.status === 'ATIVO' && data.authorized) {
        // Licença já liberada diretamente
        saveLicenseConfig({
          cnpj,
          razaoSocial,
          nomeFantasia,
          phone,
          status: 'LIBERADO',
          lastServerContact: new Date().toISOString(),
          lastCheckAttempt: new Date().toISOString(),
          lastBlockReason: null,
          signature: data.signature,
        });

        return {
          success: true,
          status: 'LIBERADO',
          message: 'Licença confirmada e liberada com sucesso!',
        };
      } else {
        // Pendente de aprovação
        saveLicenseConfig({
          cnpj,
          razaoSocial,
          nomeFantasia,
          phone,
          status: 'PENDENTE',
          lastCheckAttempt: new Date().toISOString(),
          lastBlockReason: data.message,
        });

        return {
          success: true,
          status: 'PENDENTE',
          message: data.message || 'Solicitação enviada! Aguardando aprovação pelo administrador.',
        };
      }
    } else {
      throw new Error(data.error || `Servidor de validação indisponível (HTTP ${status})`);
    }
  } catch (err: any) {
    // Salva localmente como PENDENTE mesmo se der timeout na primeira tentativa
    saveLicenseConfig({
      cnpj,
      razaoSocial,
      nomeFantasia,
      phone,
      status: 'PENDENTE',
      lastCheckAttempt: new Date().toISOString(),
      lastBlockReason: 'Falha ao contatar servidor de licenças: ' + err.message,
    });

    return {
      success: false,
      status: 'PENDENTE',
      message: 'Não foi possível contatar o servidor de licenças (' + err.message + '). Verifique sua conexão com a internet.',
    };
  }
}

/**
 * Realiza a consulta ativa ao servidor VPS
 */
export async function syncLicenseWithVPS(): Promise<LicenseStatusResult> {
  const config = getLicenseConfig();
  const attemptTime = new Date().toISOString();

  if (!config.cnpj) {
    return evaluateLicenseLocal();
  }

  try {
    const { ok, status, data } = await callLicenseApi('/api/license/verify', {
      cnpj: config.cnpj,
      razaoSocial: config.razaoSocial,
      systemVersion: 'Web-Gescom v1.0.0 (Porta 1806)',
    });

    if (ok) {
      if (data.authorized) {
        // Sucesso: licença ativa
        saveLicenseConfig({
          status: 'LIBERADO',
          lastServerContact: new Date().toISOString(),
          lastCheckAttempt: attemptTime,
          lastBlockReason: null,
          signature: data.signature,
        });

        return {
          isBlocked: false,
          status: 'LIBERADO',
          daysOffline: 0,
          daysRemaining: 5,
          lastContactDate: new Date().toISOString(),
          cnpj: config.cnpj,
          razaoSocial: config.razaoSocial,
          nomeFantasia: config.nomeFantasia,
          vpsUrl: OFFICIAL_LICENSE_SERVER,
        };
      } else {
        // Bloqueado pelo servidor (ex: SUSPENSO por inadimplência ou PENDENTE)
        const reason = data.message || 'Sistema suspenso por pendência financeira.';
        const newStatus = data.status === 'PENDENTE' ? 'PENDENTE' : 'BLOQUEADO';

        saveLicenseConfig({
          status: newStatus,
          lastCheckAttempt: attemptTime,
          lastBlockReason: reason,
        });

        return {
          isBlocked: true,
          status: newStatus,
          reason,
          daysOffline: 0,
          daysRemaining: 0,
          lastContactDate: config.lastServerContact,
          cnpj: config.cnpj,
          razaoSocial: config.razaoSocial,
          nomeFantasia: config.nomeFantasia,
          vpsUrl: OFFICIAL_LICENSE_SERVER,
        };
      }
    } else {
      throw new Error(`Servidor respondeu com código ${status}`);
    }
  } catch (err: any) {
    // Servidor offline / sem internet / timeout
    console.warn('[Licensing] Falha de comunicação com servidor VPS:', err.message);
    saveLicenseConfig({ lastCheckAttempt: attemptTime });
    return evaluateLicenseLocal();
  }
}

