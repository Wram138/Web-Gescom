import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');

    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const payables = await prisma.accountPayable.findMany({
      where,
      include: {
        supplier: true,
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
      return { ...item, status: currentStatus };
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

    const payable = await prisma.accountPayable.create({
      data: {
        description,
        supplierId: supplierId || null,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        category: category || 'Despesa Geral',
        paymentMethod: paymentMethod || 'BOLETO',
        notes,
        status: 'PENDENTE',
      },
      include: { supplier: true },
    });

    return NextResponse.json(payable, { status: 201 });
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

