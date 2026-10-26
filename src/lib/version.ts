import versionData from './version.json';

export interface VersionHistoryItem {
  version: string;
  build: number;
  date: string;
  title: string;
  description: string;
}

export interface VersionInfo {
  version: string;
  build: number;
  updatedAt: string;
  history: VersionHistoryItem[];
}

export const appVersion: VersionInfo = versionData as VersionInfo;

export function getFormattedVersion(): string {
  return `v${appVersion.version} (Build #${appVersion.build})`;
}

export function getFormattedDate(): string {
  try {
    const d = new Date(appVersion.updatedAt);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return appVersion.updatedAt;
  }
}

