import { NextResponse } from 'next/server';
import {
  getLicenseConfig,
  saveLicenseConfig,
  evaluateLicenseLocal,
  syncLicenseWithVPS,
  requestLicenseActivation,
} from '@/lib/licensing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = evaluateLicenseLocal();
    const config = getLicenseConfig();
    return NextResponse.json({ ...status, config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Se o cliente estiver solicitando ativação inicial (Primeira abertura com banco zerado)
    if (body?.action === 'REQUEST_ACTIVATION') {
      const { cnpj, razaoSocial, nomeFantasia, phone } = body;
      const activationRes = await requestLicenseActivation({ cnpj, razaoSocial, nomeFantasia, phone });
      const localStatus = evaluateLicenseLocal();
      const config = getLicenseConfig();
      return NextResponse.json({ ...localStatus, config, activationResult: activationRes });
    }

    // Caso contrário, ação padrão: sincronizar / verificar licença com o servidor VPS
    const result = await syncLicenseWithVPS();
    const config = getLicenseConfig();
    return NextResponse.json({ ...result, config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { cnpj, razaoSocial, nomeFantasia, phone } = body;

    // Salva apenas os dados cadastrais da empresa - vpsUrl é protegida e fixa em valida.alecrim.tec.br
    saveLicenseConfig({
      cnpj: cnpj ? cnpj.trim() : undefined,
      razaoSocial: razaoSocial ? razaoSocial.trim() : undefined,
      nomeFantasia: nomeFantasia !== undefined ? nomeFantasia.trim() : undefined,
      phone: phone !== undefined ? phone.trim() : undefined,
    });

    // Tenta sincronizar com os novos dados
    const result = await syncLicenseWithVPS();
    const config = getLicenseConfig();

    return NextResponse.json({ ...result, config, message: 'Dados da empresa atualizados com sucesso!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

