import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');
    const includeGoals = searchParams.get('includeGoals') === 'true';

    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            username: true,
            commissionRate: true,
            monthlyGoal: true,
          },
        },
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

    if (!includeGoals) {
      return NextResponse.json(commissions);
    }

    // Calcula sumário de metas de todos os vendedores no mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const sellers = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: ['VENDEDOR', 'GERENTE', 'ADMIN'] },
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        commissionRate: true,
        monthlyGoal: true,
      },
      orderBy: { name: 'asc' },
    });

    const goalsSummary = await Promise.all(
      sellers.map(async (seller) => {
        const salesAgg = await prisma.sale.aggregate({
          _sum: { total: true },
          _count: { id: true },
          where: {
            sellerId: seller.id,
            status: 'CONCLUIDA',
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        });

        const monthSales = salesAgg._sum.total || 0;
        const salesCount = salesAgg._count.id || 0;
        const goal = seller.monthlyGoal || 0;
        const goalReached = goal > 0 && monthSales >= goal;
        const progressPercent = goal > 0 ? Math.round((monthSales / goal) * 100) : 0;
        const remainingToGoal = goal > 0 ? Math.max(0, goal - monthSales) : 0;

        // Comissões do mês
        const commsInMonth = await prisma.commission.findMany({
          where: {
            sellerId: seller.id,
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        });

        const pendingCommission = commsInMonth
          .filter((c) => c.status === 'PENDENTE')
          .reduce((acc, c) => acc + c.amount, 0);

        const paidCommission = commsInMonth
          .filter((c) => c.status === 'PAGO')
          .reduce((acc, c) => acc + c.amount, 0);

        const doubledCount = commsInMonth.filter((c) => c.isDoubled).length;

        return {
          sellerId: seller.id,
          sellerName: seller.name,
          username: seller.username,
          role: seller.role,
          commissionRate: seller.commissionRate,
          monthlyGoal: goal,
          monthSales,
          salesCount,
          goalReached,
          progressPercent,
          remainingToGoal,
          pendingCommission,
          paidCommission,
          doubledCount,
        };
      })
    );

    return NextResponse.json({
      commissions,
      goalsSummary,
      currentMonthLabel: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    });
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

