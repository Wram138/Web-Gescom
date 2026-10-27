import fs from 'fs';
import path from 'path';

export interface VersionInfo {
  version: string;
  build: number;
  updatedAt: string;
}

export function getCurrentVersionInfo(): VersionInfo {
  try {
    const iniPath = path.join(process.cwd(), 'version.ini');
    if (fs.existsSync(iniPath)) {
      const content = fs.readFileSync(iniPath, 'utf8');
      const versionMatch = content.match(/Version=([^\r\n]+)/i);
      const buildMatch = content.match(/Build=([^\r\n]+)/i);
      const updatedMatch = content.match(/UpdatedAt=([^\r\n]+)/i);

      if (versionMatch) {
        return {
          version: versionMatch[1].trim(),
          build: buildMatch ? parseInt(buildMatch[1].trim(), 10) : 1,
          updatedAt: updatedMatch ? updatedMatch[1].trim() : new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.warn('Erro ao ler version.ini:', e);
  }

  // Fallback para package.json
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) {
        return {
          version: pkg.version,
          build: 1,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch {}

  return {
    version: '1.0.0',
    build: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function getCurrentVersion(): string {
  return getCurrentVersionInfo().version;
}

/**
 * Compara duas versões semânticas (ex: '1.0.0' vs '1.0.1').
 * Retorna:
 *  1 se v1 > v2
 * -1 se v1 < v2
 *  0 se v1 == v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
