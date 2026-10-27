import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30days'; // today, 7days, 30days, month

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Determina data de início com base no período solicitado
    let startDate: Date;
    let daysToGenerate = 7;

    if (period === 'today') {
      startDate = today;
      daysToGenerate = 1;
    } else if (period === '7days') {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      daysToGenerate = 7;
    } else if (period === 'month') {
      startDate = firstDayOfMonth;
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      daysToGenerate = now.getDate(); // Até o dia de hoje no mês
    } else {
      // 30days (padrão)
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      daysToGenerate = 30;
    }

    // 1. Vendas de Hoje
    const salesToday = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today },
        status: 'CONCLUIDA',
      },
    });
    const totalSalesToday = salesToday.reduce((acc, s) => acc + s.total, 0);
    const countSalesToday = salesToday.length;
    const ticketMedioToday = countSalesToday > 0 ? totalSalesToday / countSalesToday : 0;

    // 2. Vendas do Mês
    const salesMonth = await prisma.sale.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
        status: 'CONCLUIDA',
      },
    });
    const totalSalesMonth = salesMonth.reduce((acc, s) => acc + s.total, 0);

    // 3. Vendas no Período Selecionado (com itens para calcular custo e lucro)
    const salesInPeriod = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'CONCLUIDA',
      },
      include: {
        items: true,
        payments: true,
        seller: { select: { id: true, name: true, monthlyGoal: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalSalesPeriod = salesInPeriod.reduce((acc, s) => acc + s.total, 0);
    const countSalesPeriod = salesInPeriod.length;
    const averageTicketPeriod = countSalesPeriod > 0 ? totalSalesPeriod / countSalesPeriod : 0;

    // Calcula CMV (Custo das Mercadorias Vendidas) e Lucro Bruto do período
    let totalCostPeriod = 0;
    for (const sale of salesInPeriod) {
      for (const item of sale.items) {
        totalCostPeriod += (Number(item.costPrice) || 0) * Number(item.quantity);
      }
    }
    const estimatedProfitPeriod = Math.max(0, totalSalesPeriod - totalCostPeriod);
    const profitMarginPercent = totalSalesPeriod > 0 ? Math.round((estimatedProfitPeriod / totalSalesPeriod) * 100) : 0;

    // 4. Monta Dados do Gráfico Diário de Faturamento
    const dailyMap: Record<string, { label: string; dayName: string; total: number; count: number; cost: number; profit: number }> = {};
    const dNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Inicializa todos os dias do período (mesmo que com 0) para o gráfico não ter furos
    const tempDate = new Date(startDate);
    const endDateForChart = new Date();
    while (tempDate <= endDateForChart) {
      const yyyy = tempDate.getFullYear();
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const label = `${dd}/${mm}`;
      const dayName = dNames[tempDate.getDay()];

      dailyMap[key] = { label, dayName, total: 0, count: 0, cost: 0, profit: 0 };
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Preenche com as vendas reais
    for (const sale of salesInPeriod) {
      const sDate = new Date(sale.createdAt);
      const yyyy = sDate.getFullYear();
      const mm = String(sDate.getMonth() + 1).padStart(2, '0');
      const dd = String(sDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      if (dailyMap[key]) {
        dailyMap[key].total += sale.total;
        dailyMap[key].count += 1;
        let sCost = 0;
        for (const it of sale.items) {
          sCost += (Number(it.costPrice) || 0) * Number(it.quantity);
        }
        dailyMap[key].cost += sCost;
        dailyMap[key].profit += Math.max(0, sale.total - sCost);
      }
    }

    const dailyChartData = Object.entries(dailyMap).map(([date, val]) => ({
      date,
      ...val,
    }));

    // 5. Produtos Mais Vendidos (Top Produtos do Período)
    const productStatsMap: Record<string, {
      productId: string;
      name: string;
      code: string;
      quantitySold: number;
      totalRevenue: number;
      totalCost: number;
      unit: string;
      stockQuantity: number;
      minStock: number;
      categoryName: string;
    }> = {};

    for (const sale of salesInPeriod) {
      for (const item of sale.items) {
        if (!productStatsMap[item.productId]) {
          productStatsMap[item.productId] = {
            productId: item.productId,
            name: item.productName,
            code: '',
            quantitySold: 0,
            totalRevenue: 0,
            totalCost: 0,
            unit: 'UN',
            stockQuantity: 0,
            minStock: 0,
            categoryName: 'Geral',
          };
        }
        productStatsMap[item.productId].quantitySold += item.quantity;
        productStatsMap[item.productId].totalRevenue += item.total;
        productStatsMap[item.productId].totalCost += (Number(item.costPrice) || 0) * item.quantity;
      }
    }

    // Busca detalhes complementares de estoque e categoria dos produtos
    const productIds = Object.keys(productStatsMap);
    if (productIds.length > 0) {
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true },
      });
      for (const p of dbProducts) {
        if (productStatsMap[p.id]) {
          productStatsMap[p.id].code = p.code || p.barcode || '';
          productStatsMap[p.id].unit = p.unit || 'UN';
          productStatsMap[p.id].stockQuantity = p.stockQuantity;
          productStatsMap[p.id].minStock = p.minStock;
          productStatsMap[p.id].categoryName = p.category?.name || 'Geral';
        }
      }
    }

    const topProducts = Object.values(productStatsMap)
      .map((item) => {
        const profit = Math.max(0, item.totalRevenue - item.totalCost);
        const margin = item.totalRevenue > 0 ? Math.round((profit / item.totalRevenue) * 100) : 0;
        return {
          ...item,
          profit,
          margin,
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // 6. Distribuição por Forma de Pagamento no Período
    const paymentMap: Record<string, { label: string; color: string; amount: number; count: number }> = {
      DINHEIRO: { label: 'Dinheiro', color: '#10b981', amount: 0, count: 0 },
      PIX: { label: 'PIX Instantâneo', color: '#06b6d4', amount: 0, count: 0 },
      CARTAO_DEBITO: { label: 'Cartão de Débito', color: '#3b82f6', amount: 0, count: 0 },
      CARTAO_CREDITO: { label: 'Cartão de Crédito', color: '#8b5cf6', amount: 0, count: 0 },
      CREDIARIO: { label: 'Crediário da Loja', color: '#f59e0b', amount: 0, count: 0 },
      OUTRO: { label: 'Outros Métodos', color: '#64748b', amount: 0, count: 0 },
    };

    for (const sale of salesInPeriod) {
      for (const p of sale.payments) {
        const m = paymentMap[p.method] ? p.method : 'OUTRO';
        paymentMap[m].amount += Number(p.amount);
        paymentMap[m].count += 1;
      }
    }

    const totalPaidSum = Object.values(paymentMap).reduce((acc, curr) => acc + curr.amount, 0);
    const paymentDistribution = Object.entries(paymentMap)
      .filter(([_, val]) => val.amount > 0)
      .map(([method, val]) => ({
        method,
        ...val,
        percent: totalPaidSum > 0 ? Math.round((val.amount / totalPaidSum) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 7. Desempenho e Ranking dos Vendedores no Período
    const sellerSalesMap: Record<string, { id: string; name: string; totalSales: number; count: number; monthlyGoal: number }> = {};
    for (const sale of salesInPeriod) {
      if (sale.seller) {
        const sId = sale.seller.id;
        if (!sellerSalesMap[sId]) {
          sellerSalesMap[sId] = {
            id: sId,
            name: sale.seller.name,
            totalSales: 0,
            count: 0,
            monthlyGoal: sale.seller.monthlyGoal || 0,
          };
        }
        sellerSalesMap[sId].totalSales += sale.total;
        sellerSalesMap[sId].count += 1;
      }
    }

    const topSellers = Object.values(sellerSalesMap)
      .map((seller) => {
        const goal = seller.monthlyGoal;
        const reached = goal > 0 && seller.totalSales >= goal;
        const progress = goal > 0 ? Math.round((seller.totalSales / goal) * 100) : 0;
        return {
          ...seller,
          goalReached: reached,
          progressPercent: progress,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);

    // 8. Contas a Pagar
    const payables = await prisma.accountPayable.findMany({
      where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
    });
    const totalToPay = payables.reduce((acc, p) => acc + p.amount, 0);
    const payablesOverdue = payables.filter((p) => new Date(p.dueDate) < new Date());
    const totalPayablesOverdue = payablesOverdue.reduce((acc, p) => acc + p.amount, 0);

    // 9. Contas a Receber
    const receivables = await prisma.accountReceivable.findMany({
      where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
    });
    const totalToReceive = receivables.reduce((acc, r) => acc + r.amount, 0);
    const receivablesOverdue = receivables.filter((r) => new Date(r.dueDate) < new Date());
    const totalReceivablesOverdue = receivablesOverdue.reduce((acc, r) => acc + r.amount, 0);

    // 10. Estoque Baixo
    const allProducts = await prisma.product.findMany({
      where: { active: true },
      include: { category: true },
    });
    const lowStockProducts = allProducts.filter((p) => p.stockQuantity <= p.minStock);

    // 11. Comissões Pendentes
    const pendingCommissions = await prisma.commission.findMany({
      where: { status: 'PENDENTE' },
    });
    const totalPendingCommissions = pendingCommissions.reduce((acc, c) => acc + c.amount, 0);

    // 12. Últimas 6 vendas
    const recentSales = await prisma.sale.findMany({
      include: {
        customer: { select: { name: true } },
        seller: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // 13. Caixa aberto
    const activeCashRegister = await prisma.cashRegister.findFirst({
      where: { status: 'ABERTO' },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({
      period,
      salesToday: {
        total: totalSalesToday,
        count: countSalesToday,
        averageTicket: ticketMedioToday,
      },
      salesMonth: {
        total: totalSalesMonth,
        count: salesMonth.length,
      },
      periodStats: {
        totalSales: totalSalesPeriod,
        countSales: countSalesPeriod,
        averageTicket: averageTicketPeriod,
        totalCost: totalCostPeriod,
        estimatedProfit: estimatedProfitPeriod,
        profitMarginPercent,
      },
      dailyChartData,
      topProducts,
      paymentDistribution,
      topSellers,
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
    console.error('Erro na API de Dashboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
