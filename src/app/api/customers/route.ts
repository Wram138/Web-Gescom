import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCPF, validateCNPJ, validateCEP, formatPhone, checkRevendaValidity } from '@/lib/validators';

function validateDocument(docRaw?: string | null): { valid: boolean; formatted: string; type: 'CPF' | 'CNPJ' | 'NONE'; error?: string } {
  if (!docRaw || !docRaw.trim()) return { valid: true, formatted: '', type: 'NONE' };
  const clean = docRaw.replace(/\D/g, '');
  if (clean.length === 11) {
    const res = validateCPF(clean);
    return { valid: res.valid, formatted: res.formatted, type: 'CPF', error: res.error };
  } else if (clean.length === 14) {
    const res = validateCNPJ(clean);
    return { valid: res.valid, formatted: res.formatted, type: 'CNPJ', error: res.error };
  }
  return { valid: false, formatted: docRaw, type: 'NONE', error: 'Documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ)' };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type'); // 'CLIENTE', 'REVENDA', 'FORNECEDOR'

    const where: any = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { cpfCnpj: { contains: search } },
      ];
    }

    if (type === 'CLIENTE') {
      where.isClient = true;
    } else if (type === 'REVENDA') {
      where.isRevenda = true;
    } else if (type === 'FORNECEDOR') {
      where.isSupplier = true;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        accountsReceivable: { where: { status: 'PENDENTE' } },
        accountsPayable: { where: { status: 'PENDENTE' } },
        sales: {
          select: { id: true, total: true, createdAt: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();

    // Processa a validade dos 90 dias e status dinâmico de revenda
    const formatted = customers.map((c) => {
      let currentRevendaStatus = c.revendaStatus;

      if (c.isRevenda && c.revendaStatus === 'ATIVO' && c.revendaValidadeAte) {
        if (new Date(c.revendaValidadeAte) < now) {
          currentRevendaStatus = 'EXPIRADO';
        }
      }

      const validity = checkRevendaValidity({ ...c, revendaStatus: currentRevendaStatus });

      return {
        ...c,
        revendaStatus: currentRevendaStatus,
        validity,
        totalSalesCount: c.sales.length,
        lastSale: c.sales[0] || null,
        pendingReceivablesCount: c.accountsReceivable.length,
        pendingPayablesCount: c.accountsPayable ? c.accountsPayable.length : 0,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      hasWhatsapp = false,
      isClient = true,
      isRevenda = false,
      isSupplier = false,
      cpfCnpj,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      email,
      creditLimit = 0,
      notes,
      revendaDesconto = 0,
      approvedBy, // Se informado e usuário for ADMIN/GERENTE
    } = body;

    // 1. Validação básica: nome e telefone obrigatórios
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'O nome da pessoa é obrigatório' }, { status: 400 });
    }
    if (!phone || phone.trim().length === 0) {
      return NextResponse.json({ error: 'O telefone de contato é obrigatório' }, { status: 400 });
    }

    // Deve ser ao menos Cliente, Revenda ou Fornecedor
    const finalIsClient = isClient ?? true;
    const finalIsRevenda = Boolean(isRevenda);
    const finalIsSupplier = Boolean(isSupplier);

    if (!finalIsClient && !finalIsRevenda && !finalIsSupplier) {
      return NextResponse.json(
        { error: 'A pessoa deve ser cadastrada em ao menos um perfil: Cliente, Revenda ou Fornecedor.' },
        { status: 400 }
      );
    }

    let formattedDoc: string | null = null;
    let formattedCEP: string | null = null;
    let fullAddress: string | null = null;

    // 2. Validações adicionais e obrigatórias se for Revenda
    if (finalIsRevenda) {
      // Documento obrigatório para revenda
      if (!cpfCnpj || !cpfCnpj.trim()) {
        return NextResponse.json({ error: 'CPF ou CNPJ é obrigatório para perfil de Revenda.' }, { status: 400 });
      }
      const docResult = validateDocument(cpfCnpj);
      if (!docResult.valid) {
        return NextResponse.json({ error: `Documento inválido para Revenda: ${docResult.error}` }, { status: 400 });
      }
      formattedDoc = docResult.formatted;

      // Endereço completo obrigatório
      const cepResult = validateCEP(cep);
      if (!cepResult.valid) {
        return NextResponse.json({ error: `CEP inválido para Revenda: ${cepResult.error}` }, { status: 400 });
      }
      formattedCEP = cepResult.formatted;

      if (!street || street.trim().length === 0) {
        return NextResponse.json({ error: 'O logradouro/rua é obrigatório para cadastro de Revenda' }, { status: 400 });
      }
      if (!number || number.trim().length === 0) {
        return NextResponse.json({ error: 'O número do endereço é obrigatório para cadastro de Revenda' }, { status: 400 });
      }
      if (!neighborhood || neighborhood.trim().length === 0) {
        return NextResponse.json({ error: 'O bairro é obrigatório para cadastro de Revenda' }, { status: 400 });
      }
      if (!city || city.trim().length === 0) {
        return NextResponse.json({ error: 'A cidade é obrigatória para cadastro de Revenda' }, { status: 400 });
      }
      if (!state || state.trim().length === 0) {
        return NextResponse.json({ error: 'O estado (UF) é obrigatório para cadastro de Revenda' }, { status: 400 });
      }

      fullAddress = `${street}, ${number}${complement ? ` - ${complement}` : ''}, ${neighborhood}, ${city}/${state} - CEP: ${formattedCEP}`;
    } else {
      // Cliente ou Fornecedor simples: valida CPF/CNPJ se informado
      if (cpfCnpj && cpfCnpj.trim().length > 0) {
        const docResult = validateDocument(cpfCnpj);
        if (!docResult.valid) {
          return NextResponse.json({ error: `Documento inválido: ${docResult.error}` }, { status: 400 });
        }
        formattedDoc = docResult.formatted;
      }
      if (cep && cep.trim().length > 0) {
        const cepResult = validateCEP(cep);
        if (cepResult.valid) formattedCEP = cepResult.formatted;
      }
      if (street || number || city) {
        fullAddress = `${street || ''} ${number || ''} ${city || ''}`.trim();
      }
    }

    // Verifica se CPF/CNPJ já foi cadastrado
    if (formattedDoc) {
      const existing = await prisma.customer.findFirst({
        where: { cpfCnpj: formattedDoc },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Já existe uma pessoa cadastrada com o documento ${formattedDoc} (${existing.name})` },
          { status: 400 }
        );
      }
    }

    // Regra de aprovação do Desconto de Revenda (até 30%)
    let revendaStatus = 'NAO_REVENDA';
    let finalDiscount = 0;
    let revendaValidadeAte: Date | null = null;
    let revendaAprovadoEm: Date | null = null;
    let revendaAprovadoPor: string | null = null;

    if (finalIsRevenda) {
      const disc = Math.min(30, Math.max(0, Number(revendaDesconto) || 0));

      if (approvedBy && disc > 0) {
        revendaStatus = 'ATIVO';
        finalDiscount = disc;
        revendaAprovadoPor = approvedBy;
        revendaAprovadoEm = new Date();
        revendaValidadeAte = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 dias
      } else {
        revendaStatus = 'PENDENTE_APROVACAO';
        finalDiscount = disc;
      }
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: formatPhone(phone),
        hasWhatsapp: Boolean(hasWhatsapp),
        email: email ? email.trim() : null,
        cpfCnpj: formattedDoc,
        cep: formattedCEP,
        street: street ? street.trim() : null,
        number: number ? number.trim() : null,
        complement: complement ? complement.trim() : null,
        neighborhood: neighborhood ? neighborhood.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim().toUpperCase() : null,
        address: fullAddress,
        creditLimit: Number(creditLimit) || 0.0,
        notes: notes ? notes.trim() : null,
        isClient: finalIsClient,
        isRevenda: finalIsRevenda,
        isSupplier: finalIsSupplier,
        revendaStatus,
        revendaDesconto: finalDiscount,
        revendaAprovadoPor,
        revendaAprovadoEm,
        revendaValidadeAte,
      },
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar pessoa:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar cadastro' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    // Ação específica: Aprovar ou Renovar Revenda por Gerente/Admin
    if (action === 'APPROVE_REVENDA') {
      const { discount = 15, approvedBy } = body;
      const validDiscount = Math.min(30, Math.max(1, Number(discount)));

      if (!approvedBy) {
        return NextResponse.json({ error: 'Identificação do gerente/admin é obrigatória' }, { status: 400 });
      }

      // Certifica que tem dados completos para revenda
      if (!customer.cpfCnpj || !customer.cep || !customer.street) {
        return NextResponse.json({
          error: 'Para ativar o modo Revenda, é necessário completar o endereço e CPF do cliente.',
        }, { status: 400 });
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          isRevenda: true,
          revendaStatus: 'ATIVO',
          revendaDesconto: validDiscount,
          revendaAprovadoPor: approvedBy,
          revendaAprovadoEm: new Date(),
          revendaValidadeAte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // +90 dias
        },
      });

      return NextResponse.json({
        success: true,
        message: `Revenda aprovada com ${validDiscount}% de desconto por 90 dias!`,
        customer: updated,
      });
    }

    // Ação: Atualização completa do cadastro
    const {
      name,
      phone,
      hasWhatsapp,
      isClient,
      isRevenda,
      isSupplier,
      cpfCnpj,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      email,
      creditLimit,
      notes,
    } = body;

    let formattedDoc = customer.cpfCnpj;
    let formattedCEP = customer.cep;
    let fullAddress = customer.address;

    const targetIsRevenda = isRevenda !== undefined ? Boolean(isRevenda) : customer.isRevenda;

    if (targetIsRevenda) {
      const docInput = cpfCnpj || customer.cpfCnpj || '';
      if (!docInput.trim()) {
        return NextResponse.json({ error: 'CPF ou CNPJ é obrigatório para perfil de Revenda.' }, { status: 400 });
      }
      const docResult = validateDocument(docInput);
      if (!docResult.valid) {
        return NextResponse.json({ error: `Documento inválido para Revenda: ${docResult.error}` }, { status: 400 });
      }
      formattedDoc = docResult.formatted;

      const cepResult = validateCEP(cep || customer.cep || '');
      if (!cepResult.valid) {
        return NextResponse.json({ error: `CEP inválido para Revenda: ${cepResult.error}` }, { status: 400 });
      }
      formattedCEP = cepResult.formatted;

      if (!street || !number || !neighborhood || !city || !state) {
        return NextResponse.json({ error: 'Endereço completo é obrigatório para perfil de Revenda' }, { status: 400 });
      }
      fullAddress = `${street}, ${number}${complement ? ` - ${complement}` : ''}, ${neighborhood}, ${city}/${state} - CEP: ${formattedCEP}`;
    } else if (cpfCnpj && cpfCnpj.trim()) {
      const docResult = validateDocument(cpfCnpj);
      if (!docResult.valid) {
        return NextResponse.json({ error: `Documento inválido: ${docResult.error}` }, { status: 400 });
      }
      formattedDoc = docResult.formatted;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name ? name.trim() : customer.name,
        phone: phone ? formatPhone(phone) : customer.phone,
        hasWhatsapp: hasWhatsapp !== undefined ? Boolean(hasWhatsapp) : customer.hasWhatsapp,
        email: email !== undefined ? (email ? email.trim() : null) : customer.email,
        cpfCnpj: formattedDoc,
        cep: formattedCEP,
        street: street !== undefined ? street : customer.street,
        number: number !== undefined ? number : customer.number,
        complement: complement !== undefined ? complement : customer.complement,
        neighborhood: neighborhood !== undefined ? neighborhood : customer.neighborhood,
        city: city !== undefined ? city : customer.city,
        state: state !== undefined ? (state ? state.trim().toUpperCase() : null) : customer.state,
        address: fullAddress,
        creditLimit: creditLimit !== undefined ? Number(creditLimit) : customer.creditLimit,
        notes: notes !== undefined ? notes : customer.notes,
        isClient: isClient !== undefined ? Boolean(isClient) : customer.isClient,
        isRevenda: targetIsRevenda,
        isSupplier: isSupplier !== undefined ? Boolean(isSupplier) : customer.isSupplier,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
