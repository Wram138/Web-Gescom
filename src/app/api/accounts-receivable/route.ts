import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const receivables = await prisma.accountReceivable.findMany({
      where,
      include: {
        customer: true,
        sale: {
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Atualiza status para ATRASADO dinamicamente se a data de vencimento passou
    const now = new Date();
    const formatted = receivables.map((item) => {
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
    const { customerId, amount, dueDate, notes, totalInstallments = 1 } = data;

    if (!customerId || !amount || !dueDate) {
      return NextResponse.json({ error: 'Cliente, valor e data de vencimento são obrigatórios' }, { status: 400 });
    }

    const receivable = await prisma.accountReceivable.create({
      data: {
        customerId,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        totalInstallments: Number(totalInstallments),
        installmentNumber: 1,
        status: 'PENDENTE',
        notes,
      },
      include: { customer: true },
    });

    return NextResponse.json(receivable, { status: 201 });
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

    if (action === 'RECEIVE') {
      const updated = await prisma.accountReceivable.update({
        where: { id },
        data: {
          status: 'PAGO',
          paidDate: new Date(),
          paymentMethod: paymentMethod || 'DINHEIRO',
        },
      });
      return NextResponse.json(updated);
    }

    if (action === 'CANCEL') {
      const updated = await prisma.accountReceivable.update({
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

