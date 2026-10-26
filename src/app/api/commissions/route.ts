import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');

    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true, username: true, commissionRate: true } },
        sale: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(commissions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios' }, { status: 400 });
    }

    const updated = await prisma.commission.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'PAGO' ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

