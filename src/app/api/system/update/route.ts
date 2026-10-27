import { NextResponse } from 'next/server';
import {
  getUpdateStatus,
  downloadUpdatePackage,
  applyUpdateAndRestart,
  clearUpdateInfo,
} from '@/lib/updater';
import { syncLicenseWithVPS } from '@/lib/licensing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = getUpdateStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action || 'STATUS';

    if (action === 'CHECK') {
      // Força verificação de licença e atualizações no servidor VPS
      await syncLicenseWithVPS();
      const status = getUpdateStatus();
      return NextResponse.json({ ...status, checked: true });
    }

    if (action === 'DOWNLOAD') {
      const result = await downloadUpdatePackage(body?.url);
      const status = getUpdateStatus();
      return NextResponse.json({ ...result, ...status });
    }

    if (action === 'APPLY') {
      const result = await applyUpdateAndRestart();
      return NextResponse.json(result);
    }

    if (action === 'DISMISS') {
      clearUpdateInfo();
      const status = getUpdateStatus();
      return NextResponse.json(status);
    }

    const status = getUpdateStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('Erro na API de atualização:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

