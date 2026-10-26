import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const where: any = {};
    if (productId) where.productId = productId;

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(movements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { productId, type, quantity, reason, userId } = await request.json();

    if (!productId || !type || !quantity) {
      return NextResponse.json({ error: 'Produto, tipo e quantidade são obrigatórios' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      return NextResponse.json({ error: 'Quantidade deve ser maior que zero' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const prevStock = product.stockQuantity;
    let newStock = prevStock;

    if (type === 'ENTRADA') {
      newStock = prevStock + qty;
    } else if (type === 'SAIDA' || type === 'PERDA') {
      newStock = Math.max(0, prevStock - qty);
    } else if (type === 'AJUSTE') {
      newStock = qty; // No ajuste, a quantidade informada passa a ser o novo saldo
    }

    const result = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stockQuantity: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          type,
          quantity: type === 'AJUSTE' ? Math.abs(newStock - prevStock) : qty,
          previousStock: prevStock,
          newStock,
          reason,
          userId: userId || null,
        },
      }),
    ]);

    return NextResponse.json(result[1], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

