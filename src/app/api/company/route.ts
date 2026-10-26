import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCNPJ, validateCEP, validateInscricaoEstadual, formatPhone } from '@/lib/validators';
import { getLicenseConfig, saveLicenseConfig, syncLicenseWithVPS } from '@/lib/licensing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let setting = await prisma.systemSetting.findUnique({
      where: { id: 'config_padrao' },
    });

    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: {
          id: 'config_padrao',
          storeName: 'Web-Gescom Comercial',
          razaoSocial: '',
          cnpj: '',
          inscricaoEstadual: 'ISENTO',
          phone: '',
          cep: '',
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          uf: '',
          address: '',
          receiptFooter: 'Obrigado pela preferência! Volte sempre.',
        },
      });
    }

    // Se o banco de dados tiver campos vazios mas o license.json tiver valores, completa
    const licenseConfig = getLicenseConfig();
    const merged = {
      ...setting,
      cnpj: setting.cnpj || licenseConfig.cnpj || '',
      razaoSocial: setting.razaoSocial || licenseConfig.razaoSocial || '',
      storeName: setting.storeName || licenseConfig.nomeFantasia || 'Web-Gescom Comercial',
      phone: setting.phone || licenseConfig.phone || '',
    };

    return NextResponse.json(merged);
  } catch (error: any) {
    console.error('Erro ao buscar dados do emitente:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      razaoSocial,
      storeName,
      cnpj,
      inscricaoEstadual,
      inscricaoMunicipal,
      phone,
      email,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      receiptFooter,
    } = body;

    // 1. Validação de Razão Social
    if (!razaoSocial || !razaoSocial.trim()) {
      return NextResponse.json(
        { error: 'A Razão Social do Emitente é obrigatória.' },
        { status: 400 }
      );
    }

    // 2. Validação Rigorosa de CNPJ
    if (!cnpj || !cnpj.trim()) {
      return NextResponse.json(
        { error: 'O CNPJ do Emitente é obrigatório.' },
        { status: 400 }
      );
    }
    const cnpjValidation = validateCNPJ(cnpj);
    if (!cnpjValidation.valid) {
      return NextResponse.json(
        { error: cnpjValidation.error || 'CNPJ do Emitente inválido.' },
        { status: 400 }
      );
    }

    // 3. Validação de Inscrição Estadual (IE)
    if (!inscricaoEstadual || !inscricaoEstadual.trim()) {
      return NextResponse.json(
        { error: 'A Inscrição Estadual é obrigatória (informe o número ou marque ISENTO).' },
        { status: 400 }
      );
    }
    const ieValidation = validateInscricaoEstadual(inscricaoEstadual);
    if (!ieValidation.valid) {
      return NextResponse.json(
        { error: ieValidation.error || 'Inscrição Estadual inválida.' },
        { status: 400 }
      );
    }

    // 4. Validação de CEP
    let cleanCep = '';
    let formattedCep = '';
    if (cep && cep.trim()) {
      const cepValidation = validateCEP(cep);
      if (!cepValidation.valid) {
        return NextResponse.json(
          { error: cepValidation.error || 'CEP inválido. Deve conter 8 números.' },
          { status: 400 }
        );
      }
      cleanCep = cepValidation.clean;
      formattedCep = cepValidation.formatted;
    }

    // 5. Monta endereço consolidado para cupons de venda
    const parts = [
      logradouro ? `${logradouro}${numero ? ', ' + numero : ''}` : '',
      complemento ? `(${complemento})` : '',
      bairro || '',
      cidade && uf ? `${cidade}/${uf}` : (cidade || uf || ''),
      formattedCep ? `CEP ${formattedCep}` : '',
    ].filter(Boolean);
    const consolidatedAddress = parts.join(' - ');

    // 6. Atualiza o banco de dados
    const updated = await prisma.systemSetting.upsert({
      where: { id: 'config_padrao' },
      update: {
        razaoSocial: razaoSocial.trim(),
        storeName: (storeName || razaoSocial).trim(),
        cnpj: cnpjValidation.formatted,
        inscricaoEstadual: ieValidation.value,
        inscricaoMunicipal: inscricaoMunicipal ? inscricaoMunicipal.trim() : '',
        phone: phone ? formatPhone(phone) : '',
        email: email ? email.trim() : '',
        cep: formattedCep,
        logradouro: logradouro ? logradouro.trim() : '',
        numero: numero ? numero.trim() : '',
        complemento: complemento ? complemento.trim() : '',
        bairro: bairro ? bairro.trim() : '',
        cidade: cidade ? cidade.trim() : '',
        uf: uf ? uf.trim().toUpperCase() : '',
        address: consolidatedAddress,
        receiptFooter: receiptFooter ? receiptFooter.trim() : 'Obrigado pela preferência! Volte sempre.',
      },
      create: {
        id: 'config_padrao',
        razaoSocial: razaoSocial.trim(),
        storeName: (storeName || razaoSocial).trim(),
        cnpj: cnpjValidation.formatted,
        inscricaoEstadual: ieValidation.value,
        inscricaoMunicipal: inscricaoMunicipal ? inscricaoMunicipal.trim() : '',
        phone: phone ? formatPhone(phone) : '',
        email: email ? email.trim() : '',
        cep: formattedCep,
        logradouro: logradouro ? logradouro.trim() : '',
        numero: numero ? numero.trim() : '',
        complemento: complemento ? complemento.trim() : '',
        bairro: bairro ? bairro.trim() : '',
        cidade: cidade ? cidade.trim() : '',
        uf: uf ? uf.trim().toUpperCase() : '',
        address: consolidatedAddress,
        receiptFooter: receiptFooter ? receiptFooter.trim() : 'Obrigado pela preferência! Volte sempre.',
      },
    });

    // 7. Sincroniza com a configuração da licença local e VPS
    saveLicenseConfig({
      cnpj: cnpjValidation.clean,
      razaoSocial: razaoSocial.trim(),
      nomeFantasia: (storeName || razaoSocial).trim(),
      phone: phone ? formatPhone(phone) : undefined,
    });

    // Sincroniza em segundo plano com a VPS sem bloquear a requisição
    syncLicenseWithVPS().catch((err) => {
      console.warn('Falha na sincronização imediata com VPS (tolerância ativa):', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Dados do emitente salvos com sucesso!',
      data: updated,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar dados do emitente:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
