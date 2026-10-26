import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCPF, validateCEP, formatPhone, checkRevendaValidity } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type'); // 'REVENDA', 'SIMPLES'

    const where: any = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { cpfCnpj: { contains: search } },
      ];
    }

    if (type === 'REVENDA') {
      where.isRevenda = true;
    } else if (type === 'SIMPLES') {
      where.isRevenda = false;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        accountsReceivable: { where: { status: 'PENDENTE' } },
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
      isRevenda = false,
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

    // 1. Validação básica para Cliente Simples: apenas nome e telefone
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'O nome do cliente é obrigatório' }, { status: 400 });
    }
    if (!phone || phone.trim().length === 0) {
      return NextResponse.json({ error: 'O telefone do cliente é obrigatório' }, { status: 400 });
    }

    let formattedCPF: string | null = null;
    let formattedCEP: string | null = null;
    let fullAddress: string | null = null;

    // 2. Validações adicionais e obrigatórias se for Cliente Revenda
    if (isRevenda) {
      // CPF obrigatório e validado
      const cpfResult = validateCPF(cpfCnpj);
      if (!cpfResult.valid) {
        return NextResponse.json({ error: `CPF inválido para Revenda: ${cpfResult.error}` }, { status: 400 });
      }
      formattedCPF = cpfResult.formatted;

      // Endereço completo obrigatório
      const cepResult = validateCEP(cep);
      if (!cepResult.valid) {
        return NextResponse.json({ error: `CEP inválido para Revenda: ${cepResult.error}` }, { status: 400 });
      }
      formattedCEP = cepResult.formatted;

      if (!street || street.trim().length === 0) {
        return NextResponse.json({ error: 'O logradouro/rua é obrigatório para cliente Revenda' }, { status: 400 });
      }
      if (!number || number.trim().length === 0) {
        return NextResponse.json({ error: 'O número do endereço é obrigatório para cliente Revenda' }, { status: 400 });
      }
      if (!neighborhood || neighborhood.trim().length === 0) {
        return NextResponse.json({ error: 'O bairro é obrigatório para cliente Revenda' }, { status: 400 });
      }
      if (!city || city.trim().length === 0) {
        return NextResponse.json({ error: 'A cidade é obrigatória para cliente Revenda' }, { status: 400 });
      }
      if (!state || state.trim().length === 0) {
        return NextResponse.json({ error: 'O estado (UF) é obrigatório para cliente Revenda' }, { status: 400 });
      }

      fullAddress = `${street}, ${number}${complement ? ` - ${complement}` : ''}, ${neighborhood}, ${city}/${state} - CEP: ${formattedCEP}`;
    } else {
      // Cliente Simples: valida CPF apenas se fornecido
      if (cpfCnpj && cpfCnpj.trim().length > 0) {
        const cpfResult = validateCPF(cpfCnpj);
        if (!cpfResult.valid) {
          return NextResponse.json({ error: `CPF inválido: ${cpfResult.error}` }, { status: 400 });
        }
        formattedCPF = cpfResult.formatted;
      }
      if (cep && cep.trim().length > 0) {
        const cepResult = validateCEP(cep);
        if (cepResult.valid) formattedCEP = cepResult.formatted;
      }
      if (street || number || city) {
        fullAddress = `${street || ''} ${number || ''} ${city || ''}`.trim();
      }
    }

    // Verifica se CPF já foi cadastrado
    if (formattedCPF) {
      const existing = await prisma.customer.findFirst({
        where: { cpfCnpj: formattedCPF },
      });
      if (existing) {
        return NextResponse.json({ error: `Já existe um cliente cadastrado com o CPF ${formattedCPF}` }, { status: 400 });
      }
    }

    // Regra de aprovação do Desconto de Revenda (até 30%)
    let revendaStatus = 'NAO_REVENDA';
    let finalDiscount = 0;
    let revendaValidadeAte: Date | null = null;
    let revendaAprovadoEm: Date | null = null;
    let revendaAprovadoPor: string | null = null;

    if (isRevenda) {
      const disc = Math.min(30, Math.max(0, Number(revendaDesconto) || 0));

      if (approvedBy && disc > 0) {
        // Aprovado diretamente pelo Gerente/Admin
        revendaStatus = 'ATIVO';
        finalDiscount = disc;
        revendaAprovadoPor = approvedBy;
        revendaAprovadoEm = new Date();
        // 90 dias de validade inicial
        revendaValidadeAte = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      } else {
        // Criado por operador ou sem aprovação imediata -> Aguardando Gerente/Admin
        revendaStatus = 'PENDENTE_APROVACAO';
        finalDiscount = disc; // Sugerido
      }
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: formatPhone(phone),
        hasWhatsapp: Boolean(hasWhatsapp),
        email: email ? email.trim() : null,
        cpfCnpj: formattedCPF,
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
        isRevenda: Boolean(isRevenda),
        revendaStatus,
        revendaDesconto: finalDiscount,
        revendaAprovadoPor,
        revendaAprovadoEm,
        revendaValidadeAte,
      },
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar cliente:', error);
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
      isRevenda,
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

    let formattedCPF = customer.cpfCnpj;
    let formattedCEP = customer.cep;
    let fullAddress = customer.address;

    if (isRevenda) {
      const cpfResult = validateCPF(cpfCnpj || customer.cpfCnpj || '');
      if (!cpfResult.valid) {
        return NextResponse.json({ error: `CPF inválido para Revenda: ${cpfResult.error}` }, { status: 400 });
      }
      formattedCPF = cpfResult.formatted;

      const cepResult = validateCEP(cep || customer.cep || '');
      if (!cepResult.valid) {
        return NextResponse.json({ error: `CEP inválido para Revenda: ${cepResult.error}` }, { status: 400 });
      }
      formattedCEP = cepResult.formatted;

      if (!street || !number || !neighborhood || !city || !state) {
        return NextResponse.json({ error: 'Endereço completo é obrigatório para cliente Revenda' }, { status: 400 });
      }
      fullAddress = `${street}, ${number}${complement ? ` - ${complement}` : ''}, ${neighborhood}, ${city}/${state} - CEP: ${formattedCEP}`;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name ? name.trim() : customer.name,
        phone: phone ? formatPhone(phone) : customer.phone,
        hasWhatsapp: hasWhatsapp !== undefined ? Boolean(hasWhatsapp) : customer.hasWhatsapp,
        email: email !== undefined ? (email ? email.trim() : null) : customer.email,
        cpfCnpj: formattedCPF,
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
        isRevenda: isRevenda !== undefined ? Boolean(isRevenda) : customer.isRevenda,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
