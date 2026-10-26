import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const lowStock = searchParams.get('lowStock') === 'true';

    const where: any = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { code: { contains: search } },
      ];
    }

    let products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        supplier: true,
      },
      orderBy: { name: 'asc' },
    });

    if (lowStock) {
      products = products.filter((p) => p.stockQuantity <= p.minStock);
    }

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      code,
      barcode,
      name,
      description,
      unit,
      categoryId,
      supplierId,
      costPrice,
      salePrice,
      stockQuantity,
      minStock,
      commissionRate,
      userId,
    } = data;

    if (!name || salePrice === undefined) {
      return NextResponse.json({ error: 'Nome e Preço de Venda são obrigatórios' }, { status: 400 });
    }

    const initialStock = Number(stockQuantity) || 0;

    const product = await prisma.product.create({
      data: {
        code: code || null,
        barcode: barcode || null,
        name,
        description: description || null,
        unit: unit || 'UN',
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        costPrice: Number(costPrice) || 0.0,
        salePrice: Number(salePrice) || 0.0,
        stockQuantity: initialStock,
        minStock: Number(minStock) || 0.0,
        commissionRate: commissionRate !== undefined && commissionRate !== '' ? Number(commissionRate) : null,
      },
    });

    // Registra movimentação inicial caso tenha estoque
    if (initialStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'ENTRADA',
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          reason: 'Estoque inicial cadastrado',
          userId: userId || null,
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const {
      id,
      code,
      barcode,
      name,
      description,
      unit,
      categoryId,
      supplierId,
      costPrice,
      salePrice,
      minStock,
      commissionRate,
      active,
    } = data;

    if (!id) return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        code: code || null,
        barcode: barcode || null,
        name,
        description: description || null,
        unit: unit || 'UN',
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        costPrice: Number(costPrice) || 0.0,
        salePrice: Number(salePrice) || 0.0,
        minStock: Number(minStock) || 0.0,
        commissionRate: commissionRate !== undefined && commissionRate !== '' ? Number(commissionRate) : null,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

