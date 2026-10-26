import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');

    const where: any = {};
    if (status) where.status = status;
    if (supplierId) {
      where.OR = [
        { supplierId: supplierId },
        { personId: supplierId }
      ];
    }

    const payables = await prisma.accountPayable.findMany({
      where,
      include: {
        supplier: true,
        person: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    // Atualiza dinamicamente status para ATRASADO se a data de vencimento passou e está PENDENTE
    const now = new Date();
    const formatted = payables.map((item) => {
      let currentStatus = item.status;
      if (currentStatus === 'PENDENTE' && new Date(item.dueDate) < now) {
        currentStatus = 'ATRASADO';
      }

      // Resolve o favorecido/fornecedor independentemente se for da tabela Supplier ou Customer (Pessoas)
      const resolvedSupplier = item.supplier || (item.person ? {
        id: item.person.id,
        name: item.person.name,
        cnpj: item.person.cpfCnpj,
        phone: item.person.phone,
        isPerson: true,
      } : null);

      return {
        ...item,
        supplier: resolvedSupplier,
        status: currentStatus,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { description, supplierId, amount, dueDate, category, paymentMethod, notes } = data;

    if (!description || !amount || !dueDate) {
      return NextResponse.json({ error: 'Descrição, valor e data de vencimento são obrigatórios' }, { status: 400 });
    }

    let finalSupplierId: string | null = null;
    let finalPersonId: string | null = null;

    if (supplierId) {
      // Verifica se o ID pertence a uma Pessoa (Customer) cadastrada como fornecedor
      const isPerson = await prisma.customer.findUnique({ where: { id: supplierId } });
      if (isPerson) {
        finalPersonId = supplierId;
      } else {
        finalSupplierId = supplierId;
      }
    }

    const payable = await prisma.accountPayable.create({
      data: {
        description,
        supplierId: finalSupplierId,
        personId: finalPersonId,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        category: category || 'Despesa Geral',
        paymentMethod: paymentMethod || 'BOLETO',
        notes,
        status: 'PENDENTE',
      },
      include: { supplier: true, person: true },
    });

    const resolvedSupplier = payable.supplier || (payable.person ? {
      id: payable.person.id,
      name: payable.person.name,
      cnpj: payable.person.cpfCnpj,
      phone: payable.person.phone,
      isPerson: true,
    } : null);

    return NextResponse.json({ ...payable, supplier: resolvedSupplier }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, action, paymentMethod } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'ID e ação são obrigatórios' }, { status: 400 });
    }

    if (action === 'PAY') {
      const updated = await prisma.accountPayable.update({
        where: { id },
        data: {
          status: 'PAGO',
          paidDate: new Date(),
          paymentMethod: paymentMethod || undefined,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === 'CANCEL') {
      const updated = await prisma.accountPayable.update({
        where: { id },
        data: { status: 'CANCELADO' },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

