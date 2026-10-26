import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDENTE';
    const sellerId = searchParams.get('sellerId');

    const where: any = {};
    if (status !== 'ALL') where.status = status;
    if (sellerId) where.sellerId = sellerId;

    const preSales = await prisma.preSale.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true, username: true } },
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(preSales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sellerId, customerId, customerName, items, discount = 0, notes } = body;

    if (!sellerId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Vendedor e itens são obrigatórios para a comanda' }, { status: 400 });
    }

    let subtotal = 0;
    const itemsToCreate: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return NextResponse.json({ error: `Produto ${item.productId} não encontrado` }, { status: 404 });
      }

      const itemTotal = Number(item.unitPrice) * Number(item.quantity) - (Number(item.discount) || 0);
      subtotal += itemTotal;

      itemsToCreate.push({
        productId: product.id,
        productName: product.name,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        discount: Number(item.discount) || 0,
        total: itemTotal,
      });
    }

    const finalTotal = Math.max(0, subtotal - (Number(discount) || 0));

    const preSale = await prisma.preSale.create({
      data: {
        sellerId,
        customerId: customerId || null,
        customerName: customerName || null,
        subtotal,
        discount: Number(discount) || 0,
        total: finalTotal,
        status: 'PENDENTE',
        notes: notes || null,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        seller: { select: { id: true, name: true } },
        customer: true,
        items: true,
      },
    });

    return NextResponse.json(preSale, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao gerar comanda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, action, status } = body;

    if (!id) return NextResponse.json({ error: 'ID da comanda é obrigatório' }, { status: 400 });

    let newStatus = status;
    if (action === 'FATURAR') newStatus = 'FATURADO';
    if (action === 'CANCELAR') newStatus = 'CANCELADO';

    const updated = await prisma.preSale.update({
      where: { id: Number(id) },
      data: { status: newStatus },
      include: { items: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
