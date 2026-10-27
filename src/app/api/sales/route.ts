import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { evaluateLicenseLocal } from '@/lib/licensing';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const sellerId = searchParams.get('sellerId');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        cashier: { select: { id: true, name: true, username: true } },
        seller: { select: { id: true, name: true, username: true, commissionRate: true } },
        customer: true,
        items: true,
        payments: true,
        commissions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(sales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Verificação de Licença Ativa (Impede faturamento se inadimplente ou > 5 dias offline)
    const license = evaluateLicenseLocal();
    if (license.isBlocked) {
      return NextResponse.json({
        error: `[Acesso Bloqueado por Licença] ${license.reason}`,
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      cashRegisterId,
      cashierId,
      sellerId,
      customerId,
      items,
      payments,
      discount = 0,
      notes,
    } = body;

    if (!cashierId || !items || items.length === 0 || !payments || payments.length === 0) {
      return NextResponse.json({ error: 'Operador, itens e pagamentos são obrigatórios' }, { status: 400 });
    }

    // Regra Obrigatória 1: Só é permitido efetuar vendas com turno de caixa ABERTO
    let activeRegister = null;
    if (cashRegisterId) {
      activeRegister = await prisma.cashRegister.findUnique({
        where: { id: cashRegisterId },
      });
    }

    if (!activeRegister || activeRegister.status !== 'ABERTO') {
      activeRegister = await prisma.cashRegister.findFirst({
        where: { status: 'ABERTO' },
        orderBy: { openedAt: 'desc' },
      });
    }

    if (!activeRegister || activeRegister.status !== 'ABERTO') {
      return NextResponse.json(
        { error: 'Não é permitido efetuar vendas sem um turno de caixa aberto. Abra o caixa antes de iniciar as vendas.' },
        { status: 400 }
      );
    }

    // Regra Obrigatória 2: Um caixa não pode ficar aberto de um dia para o outro
    const openedDate = new Date(activeRegister.openedAt);
    const now = new Date();
    const isFromPreviousDay =
      openedDate.getFullYear() < now.getFullYear() ||
      openedDate.getMonth() < now.getMonth() ||
      openedDate.getDate() < now.getDate();

    if (isFromPreviousDay) {
      const formattedDate = openedDate.toLocaleDateString('pt-BR');
      return NextResponse.json(
        {
          error: `O caixa atual é de um dia anterior (${formattedDate}). É obrigatório realizar o fechamento deste caixa antes de iniciar as vendas de hoje.`,
          requiresCashClosing: true,
          registerId: activeRegister.id,
        },
        { status: 400 }
      );
    }

    const targetCashRegisterId = activeRegister.id;

    // Busca dados do vendedor (para comissão e metas)
    let sellerCommissionRate = 0;
    let sellerMonthlyGoal = 0;
    if (sellerId) {
      const seller = await prisma.user.findUnique({ where: { id: sellerId } });
      if (seller) {
        sellerCommissionRate = seller.commissionRate || 0;
        sellerMonthlyGoal = seller.monthlyGoal || 0;
      }
    }

    // Calcula subtotal e prepara itens
    let subtotal = 0;
    let totalCommission = 0;

    const itemsToCreate: any[] = [];
    const stockUpdates: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return NextResponse.json({ error: `Produto ${item.productId} não encontrado` }, { status: 404 });
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json({
          error: `Estoque insuficiente para o produto "${product.name}". Saldo atual: ${product.stockQuantity}`,
        }, { status: 400 });
      }

      const itemTotal = Number(item.unitPrice) * Number(item.quantity) - (Number(item.discount) || 0);
      subtotal += itemTotal;

      // Taxa de comissão: se o produto tiver específica, usa ela; senão usa a do vendedor
      const commRate = product.commissionRate !== null && product.commissionRate !== undefined
        ? product.commissionRate
        : sellerCommissionRate;

      const commAmount = (itemTotal * commRate) / 100;
      totalCommission += commAmount;

      itemsToCreate.push({
        productId: product.id,
        productName: product.name,
        unitPrice: Number(item.unitPrice),
        costPrice: product.costPrice,
        quantity: Number(item.quantity),
        discount: Number(item.discount) || 0,
        total: itemTotal,
        commissionRate: commRate,
        commissionAmount: commAmount,
      });

      stockUpdates.push({
        product,
        quantity: Number(item.quantity),
      });
    }

    const finalTotal = Math.max(0, subtotal - (Number(discount) || 0));

    // Valida pagamentos
    let totalPaid = 0;
    for (const p of payments) {
      totalPaid += Number(p.amount);
    }

    // Transação para gravar a venda de forma atômica
    const createdSale = await prisma.$transaction(async (tx) => {
      // 1. Cria a venda
      const sale = await tx.sale.create({
        data: {
          cashRegisterId: targetCashRegisterId,
          cashierId,
          sellerId: sellerId || null,
          customerId: customerId || null,
          subtotal,
          discount: Number(discount) || 0,
          total: finalTotal,
          status: 'CONCLUIDA',
          paymentMethod: payments[0]?.method || 'DINHEIRO',
          notes: notes || null,
          items: {
            create: itemsToCreate,
          },
          payments: {
            create: payments.map((p: any) => ({
              method: p.method,
              amount: Number(p.amount),
              installments: Number(p.installments) || 1,
              changeAmount: Number(p.changeAmount) || 0,
            })),
          },
        },
        include: {
          items: true,
          payments: true,
          customer: true,
          seller: true,
          cashier: true,
        },
      });

      // 2. Atualiza estoque e registra movimentações
      for (const update of stockUpdates) {
        const newStock = update.product.stockQuantity - update.quantity;
        await tx.product.update({
          where: { id: update.product.id },
          data: { stockQuantity: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: update.product.id,
            type: 'SAIDA',
            quantity: update.quantity,
            previousStock: update.product.stockQuantity,
            newStock,
            reason: `Venda #${sale.id}`,
            userId: cashierId,
          },
        });
      }

      // 3. Se houver vendedor e comissão > 0, cria o registro de comissão com verificação de meta mensal
      if (sellerId && totalCommission > 0) {
        let isDoubled = false;
        let finalCommissionAmount = totalCommission;
        let originalAmount = totalCommission;
        let notesText = `Comissão gerada na Venda #${sale.id}`;

        if (sellerMonthlyGoal > 0) {
          // Calcula início e fim do mês corrente
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

          // Soma vendas concluídas do vendedor neste mês (excluindo a venda atual que acabou de ser inserida)
          const salesInMonth = await tx.sale.aggregate({
            _sum: { total: true },
            where: {
              sellerId,
              status: 'CONCLUIDA',
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
              id: { not: sale.id },
            },
          });

          const currentMonthSalesBefore = salesInMonth._sum.total || 0;
          const newMonthSales = currentMonthSalesBefore + finalTotal;

          if (newMonthSales >= sellerMonthlyGoal) {
            isDoubled = true;
            finalCommissionAmount = totalCommission * 2;
            notesText = `Comissão gerada na Venda #${sale.id} (🎯 Meta mensal atingida: comissão dobrada 2x)`;

            // Se atingiu a meta com esta venda (antes ainda não havia batido), dobra retroativamente as comissões pendentes do mês!
            if (currentMonthSalesBefore < sellerMonthlyGoal) {
              const pendingCommissions = await tx.commission.findMany({
                where: {
                  sellerId,
                  status: 'PENDENTE',
                  isDoubled: false,
                  createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                  },
                },
              });

              for (const comm of pendingCommissions) {
                await tx.commission.update({
                  where: { id: comm.id },
                  data: {
                    isDoubled: true,
                    originalAmount: comm.amount,
                    amount: comm.amount * 2,
                    notes: `${comm.notes || ''} (🎯 Dobrada pelo atingimento da meta mensal)`.trim(),
                  },
                });
              }
            }
          }
        }

        await tx.commission.create({
          data: {
            saleId: sale.id,
            sellerId,
            amount: finalCommissionAmount,
            rate: sellerCommissionRate,
            isDoubled,
            originalAmount,
            status: 'PENDENTE',
            notes: notesText,
          },
        });
      }

      // 4. Se houver pagamento em CREDIARIO (A prazo), gera Contas a Receber
      const crediarioPayments = payments.filter((p: any) => p.method === 'CREDIARIO');
      for (const cp of crediarioPayments) {
        if (!customerId) {
          throw new Error('Para vendas a prazo/crediário, é obrigatório selecionar um cliente cadastrado.');
        }

        const totalInstallments = Number(cp.installments) || 1;
        const installmentAmount = Number(cp.amount) / totalInstallments;

        for (let i = 1; i <= totalInstallments; i++) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (30 * i)); // Vencimento a cada 30 dias

          await tx.accountReceivable.create({
            data: {
              saleId: sale.id,
              customerId,
              installmentNumber: i,
              totalInstallments,
              amount: installmentAmount,
              dueDate,
              status: 'PENDENTE',
              paymentMethod: 'CREDIARIO',
              notes: `Parcela ${i}/${totalInstallments} referente à Venda #${sale.id}`,
            },
          });
        }
      }

      // 5. Regras de Revenda para o Cliente
      let promotedToRevenda = false;
      let revendaRenewed = false;

      if (customerId) {
        const client = await tx.customer.findUnique({ where: { id: customerId } });

        if (client) {
          // Regra: Qualquer cliente pode se tornar revenda caso a primeira venda passe de R$ 300,00
          const priorSalesCount = await tx.sale.count({
            where: { customerId, status: 'CONCLUIDA' },
          });

          // Como a venda atual acabou de ser gravada nesta transação, priorSalesCount == 1 indica que esta é a 1ª venda do cliente!
          if (priorSalesCount <= 1 && finalTotal >= 300.0) {
            if (!client.isRevenda) {
              await tx.customer.update({
                where: { id: customerId },
                data: {
                  isRevenda: true,
                  revendaStatus: 'PENDENTE_APROVACAO',
                  notes: (client.notes ? client.notes + ' | ' : '') + `Apto à Revenda por compra inicial de R$ ${finalTotal.toFixed(2)} (Aguardando aprovação)`,
                },
              });
              promotedToRevenda = true;
            }
          }

          // Regra: O desconto de revenda é renovado por mais 90 dias a cada compra efetuada
          if (client.isRevenda && (client.revendaStatus === 'ATIVO' || client.revendaStatus === 'EXPIRADO')) {
            const newValidity = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // +90 dias
            await tx.customer.update({
              where: { id: customerId },
              data: {
                revendaStatus: 'ATIVO',
                revendaValidadeAte: newValidity,
              },
            });
            revendaRenewed = true;
          }
        }
      }

      return {
        ...sale,
        promotedToRevenda,
        revendaRenewed,
      };
    });

    return NextResponse.json(createdSale, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao finalizar venda:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar venda' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { saleId, reason, userId } = await request.json();

    if (!saleId) return NextResponse.json({ error: 'ID da venda é obrigatório' }, { status: 400 });

    const sale = await prisma.sale.findUnique({
      where: { id: Number(saleId) },
      include: { items: true, commissions: true, accountsReceivable: true },
    });

    if (!sale) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    if (sale.status === 'CANCELADA') return NextResponse.json({ error: 'Esta venda já está cancelada' }, { status: 400 });

    // Cancelamento com reversão de estoque
    await prisma.$transaction(async (tx) => {
      // 1. Marca venda como CANCELADA
      await tx.sale.update({
        where: { id: Number(saleId) },
        data: {
          status: 'CANCELADA',
          notes: (sale.notes ? sale.notes + ' | ' : '') + `Cancelada: ${reason || 'Sem motivo informado'}`,
        },
      });

      // 2. Devolve estoque de cada item
      for (const item of sale.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (prod) {
          const newStock = prod.stockQuantity + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newStock },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'ENTRADA',
              quantity: item.quantity,
              previousStock: prod.stockQuantity,
              newStock,
              reason: `Estorno de Cancelamento Venda #${sale.id}`,
              userId: userId || null,
            },
          });
        }
      }

      // 3. Cancela comissões vinculadas
      await tx.commission.updateMany({
        where: { saleId: Number(saleId) },
        data: { status: 'CANCELADO', notes: 'Comissão cancelada devido a estorno da venda' },
      });

      // 4. Cancela contas a receber pendentes
      await tx.accountReceivable.updateMany({
        where: { saleId: Number(saleId), status: 'PENDENTE' },
        data: { status: 'CANCELADO', notes: 'Cancelada por estorno de venda' },
      });
    });

    return NextResponse.json({ success: true, message: `Venda #${saleId} cancelada com sucesso!` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

