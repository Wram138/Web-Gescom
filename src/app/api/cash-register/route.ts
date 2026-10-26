import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where: any = { status: 'ABERTO' };
    if (userId) where.userId = userId;

    const currentRegister = await prisma.cashRegister.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, username: true } },
        movements: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        sales: {
          where: { status: 'CONCLUIDA' },
          include: { payments: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!currentRegister) {
      return NextResponse.json({ active: false, register: null });
    }

    // Calcula totais do caixa aberto
    let totalSales = 0;
    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalPixSales = 0;
    let totalCrediarioSales = 0;

    for (const sale of currentRegister.sales) {
      totalSales += sale.total;
      for (const p of sale.payments) {
        if (p.method === 'DINHEIRO') totalCashSales += p.amount - (p.changeAmount || 0);
        else if (p.method === 'CARTAO_DEBITO' || p.method === 'CARTAO_CREDITO') totalCardSales += p.amount;
        else if (p.method === 'PIX') totalPixSales += p.amount;
        else if (p.method === 'CREDIARIO') totalCrediarioSales += p.amount;
      }
    }

    let totalSuprimento = 0;
    let totalSangria = 0;
    for (const mov of currentRegister.movements) {
      if (mov.type === 'SUPRIMENTO') totalSuprimento += mov.amount;
      if (mov.type === 'SANGRIA') totalSangria += mov.amount;
    }

    // Total estimado em dinheiro na gaveta
    const expectedCashInDrawer = currentRegister.initialAmount + totalCashSales + totalSuprimento - totalSangria;

    // Verificação de virada de dia: um caixa não pode ficar aberto de um dia para o outro
    const openedDate = new Date(currentRegister.openedAt);
    const now = new Date();
    const isFromPreviousDay =
      openedDate.getFullYear() < now.getFullYear() ||
      openedDate.getMonth() < now.getMonth() ||
      openedDate.getDate() < now.getDate();

    return NextResponse.json({
      active: true,
      register: currentRegister,
      summary: {
        initialAmount: currentRegister.initialAmount,
        totalSales,
        totalCashSales,
        totalCardSales,
        totalPixSales,
        totalCrediarioSales,
        totalSuprimento,
        totalSangria,
        expectedCashInDrawer,
        isFromPreviousDay,
        openedDateFormatted: openedDate.toLocaleDateString('pt-BR'),
        openedTimeFormatted: openedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      action,
      userId,
      initialAmount,
      cashRegisterId,
      type,
      amount,
      reason,
      reportedCash,
      reportedCard,
      reportedPix,
      operatorNotes,
      finalAmountReported,
    } = data;

    if (action === 'OPEN') {
      if (!userId) return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });

      // Regra Obrigatória: Não pode abrir caixa se houver qualquer caixa aberto de dia anterior sem fechar
      const allOpen = await prisma.cashRegister.findMany({
        where: { status: 'ABERTO' },
        include: { user: { select: { name: true } } },
      });

      const now = new Date();
      const unclosedPrevDay = allOpen.find((r) => {
        const od = new Date(r.openedAt);
        return (
          od.getFullYear() < now.getFullYear() ||
          od.getMonth() < now.getMonth() ||
          od.getDate() < now.getDate()
        );
      });

      if (unclosedPrevDay) {
        const openedDateStr = new Date(unclosedPrevDay.openedAt).toLocaleDateString('pt-BR');
        return NextResponse.json(
          {
            error: `Existe um turno de caixa aberto do dia anterior (${openedDateStr} por ${unclosedPrevDay.user.name}) que ainda não foi fechado. É obrigatório fechar esse caixa antes de abrir um novo turno.`,
            requiresCashClosing: true,
            registerId: unclosedPrevDay.id,
          },
          { status: 400 }
        );
      }

      // Verifica se já tem caixa aberto para esse usuário hoje
      const existing = allOpen.find((r) => r.userId === userId);
      if (existing) {
        return NextResponse.json({ error: 'Já existe um caixa aberto para este operador' }, { status: 400 });
      }

      const newRegister = await prisma.cashRegister.create({
        data: {
          userId,
          initialAmount: Number(initialAmount) || 0.0,
          status: 'ABERTO',
        },
      });
      return NextResponse.json(newRegister, { status: 201 });
    }

    if (action === 'CLOSE') {
      if (!cashRegisterId) return NextResponse.json({ error: 'ID do caixa é obrigatório' }, { status: 400 });

      const register = await prisma.cashRegister.findUnique({
        where: { id: cashRegisterId },
        include: {
          user: { select: { id: true, name: true, username: true } },
          movements: true,
          sales: { where: { status: 'CONCLUIDA' }, include: { payments: true } },
        },
      });

      if (!register || register.status !== 'ABERTO') {
        return NextResponse.json({ error: 'Caixa não encontrado ou já encerrado' }, { status: 400 });
      }

      let totalCashSales = 0;
      let totalCardSales = 0;
      let totalPixSales = 0;
      let totalSalesAmount = 0;

      for (const sale of register.sales) {
        totalSalesAmount += sale.total;
        for (const p of sale.payments) {
          if (p.method === 'DINHEIRO') {
            totalCashSales += p.amount - (p.changeAmount || 0);
          } else if (p.method === 'CARTAO_DEBITO' || p.method === 'CARTAO_CREDITO') {
            totalCardSales += p.amount;
          } else if (p.method === 'PIX') {
            totalPixSales += p.amount;
          }
        }
      }

      let totalSuprimento = 0;
      let totalSangria = 0;
      for (const mov of register.movements) {
        if (mov.type === 'SUPRIMENTO') totalSuprimento += mov.amount;
        if (mov.type === 'SANGRIA') totalSangria += mov.amount;
      }

      // 1. Valores apurados pelo sistema
      const expectedCash = register.initialAmount + totalCashSales + totalSuprimento - totalSangria;
      const expectedCard = totalCardSales;
      const expectedPix = totalPixSales;
      const expectedTotal = expectedCash + expectedCard + expectedPix;

      // 2. Valores informados às cegas pelo operador
      const numReportedCash = reportedCash !== undefined ? Number(reportedCash) : (Number(finalAmountReported) || 0);
      const numReportedCard = Number(reportedCard) || 0;
      const numReportedPix = Number(reportedPix) || 0;
      const totalReported = numReportedCash + numReportedCard + numReportedPix;

      // 3. Diferenças (Sobra ou Falta)
      const diffCash = Number((numReportedCash - expectedCash).toFixed(2));
      const diffCard = Number((numReportedCard - expectedCard).toFixed(2));
      const diffPix = Number((numReportedPix - expectedPix).toFixed(2));
      const totalDiff = Number((totalReported - expectedTotal).toFixed(2));

      const getDiffStatus = (diff: number) => {
        if (Math.abs(diff) < 0.05) return 'CORRETO';
        return diff > 0 ? 'SOBRA' : 'FALTA';
      };

      const closingAudit = {
        blindClose: true,
        closedAt: new Date().toISOString(),
        openedAt: register.openedAt.toISOString(),
        operatorName: register.user.name,
        operatorUsername: register.user.username,
        initialAmount: register.initialAmount,
        totalSalesCount: register.sales.length,
        totalSalesAmount,
        suprimento: totalSuprimento,
        sangria: totalSangria,
        cash: {
          reported: numReportedCash,
          expected: expectedCash,
          diff: diffCash,
          status: getDiffStatus(diffCash),
        },
        card: {
          reported: numReportedCard,
          expected: expectedCard,
          diff: diffCard,
          status: getDiffStatus(diffCard),
        },
        pix: {
          reported: numReportedPix,
          expected: expectedPix,
          diff: diffPix,
          status: getDiffStatus(diffPix),
        },
        total: {
          reported: totalReported,
          expected: expectedTotal,
          diff: totalDiff,
          status: getDiffStatus(totalDiff),
        },
        operatorNotes: operatorNotes || '',
      };

      const closed = await prisma.cashRegister.update({
        where: { id: cashRegisterId },
        data: {
          status: 'FECHADO',
          closedAt: new Date(),
          finalAmountCalculated: expectedCash,
          finalAmountReported: numReportedCash,
          notes: JSON.stringify(closingAudit),
        },
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      });

      return NextResponse.json({
        ...closed,
        closingAudit,
      });
    }

    if (action === 'MOVEMENT') {
      if (!cashRegisterId || !userId || !type || !amount || !reason) {
        return NextResponse.json({ error: 'Todos os campos de movimentação de caixa são obrigatórios' }, { status: 400 });
      }

      const movement = await prisma.cashMovement.create({
        data: {
          cashRegisterId,
          userId,
          type, // SUPRIMENTO ou SANGRIA
          amount: Number(amount),
          reason,
        },
      });
      return NextResponse.json(movement, { status: 201 });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

