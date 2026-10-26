import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Vendas hoje
    const salesToday = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today },
        status: 'CONCLUIDA',
      },
    });

    const totalSalesToday = salesToday.reduce((acc, s) => acc + s.total, 0);
    const countSalesToday = salesToday.length;
    const ticketMedioToday = countSalesToday > 0 ? totalSalesToday / countSalesToday : 0;

    // Vendas do mês
    const salesMonth = await prisma.sale.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
        status: 'CONCLUIDA',
      },
    });
    const totalSalesMonth = salesMonth.reduce((acc, s) => acc + s.total, 0);

    // Contas a Pagar
    const payables = await prisma.accountPayable.findMany({
      where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
    });
    const totalToPay = payables.reduce((acc, p) => acc + p.amount, 0);
    const payablesOverdue = payables.filter((p) => new Date(p.dueDate) < new Date());
    const totalPayablesOverdue = payablesOverdue.reduce((acc, p) => acc + p.amount, 0);

    // Contas a Receber
    const receivables = await prisma.accountReceivable.findMany({
      where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
    });
    const totalToReceive = receivables.reduce((acc, r) => acc + r.amount, 0);
    const receivablesOverdue = receivables.filter((r) => new Date(r.dueDate) < new Date());
    const totalReceivablesOverdue = receivablesOverdue.reduce((acc, r) => acc + r.amount, 0);

    // Estoque Baixo
    const allProducts = await prisma.product.findMany({
      where: { active: true },
      include: { category: true },
    });
    const lowStockProducts = allProducts.filter((p) => p.stockQuantity <= p.minStock);

    // Comissões Pendentes
    const pendingCommissions = await prisma.commission.findMany({
      where: { status: 'PENDENTE' },
    });
    const totalPendingCommissions = pendingCommissions.reduce((acc, c) => acc + c.amount, 0);

    // Últimas 5 vendas
    const recentSales = await prisma.sale.findMany({
      include: {
        customer: { select: { name: true } },
        seller: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // Caixa aberto
    const activeCashRegister = await prisma.cashRegister.findFirst({
      where: { status: 'ABERTO' },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({
      salesToday: {
        total: totalSalesToday,
        count: countSalesToday,
        averageTicket: ticketMedioToday,
      },
      salesMonth: {
        total: totalSalesMonth,
        count: salesMonth.length,
      },
      financial: {
        totalToPay,
        totalPayablesOverdue,
        totalToReceive,
        totalReceivablesOverdue,
        totalPendingCommissions,
      },
      inventory: {
        totalProducts: allProducts.length,
        lowStockCount: lowStockProducts.length,
        lowStockItems: lowStockProducts.slice(0, 5),
      },
      recentSales,
      activeCashRegister,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

