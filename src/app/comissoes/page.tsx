'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Percent,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  Printer,
  DollarSign,
  Target,
  Trophy,
  Flame,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export default function ComissoesPage() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  const [commissions, setCommissions] = useState<any[]>([]);
  const [goalsSummary, setGoalsSummary] = useState<any[]>([]);
  const [monthLabel, setMonthLabel] = useState<string>('');
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedSellerId, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      let url = '/api/commissions?includeGoals=true&';
      if (selectedSellerId) url += `sellerId=${selectedSellerId}&`;
      if (selectedStatus) url += `status=${selectedStatus}&`;

      const [resComm, resUsers] = await Promise.all([
        fetch(url),
        fetch('/api/users'),
      ]);

      if (resComm.ok) {
        const commData = await resComm.json();
        if (commData.commissions) {
          setCommissions(commData.commissions);
          setGoalsSummary(commData.goalsSummary || []);
          setMonthLabel(commData.currentMonthLabel || '');
        } else {
          setCommissions(commData);
        }
      }
      if (resUsers.ok) setSellers(await resUsers.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayCommission = async (id: string) => {
    if (!confirm('Deseja marcar esta comissão como PAGA ao vendedor?')) return;
    try {
      const res = await fetch('/api/commissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'PAGO' }),
      });
      if (res.ok) {
        loadData();
      } else {
        alert('Erro ao atualizar status');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const totalPending = commissions
    .filter((c) => c.status === 'PENDENTE')
    .reduce((acc, c) => acc + c.amount, 0);

  const totalPaid = commissions
    .filter((c) => c.status === 'PAGO')
    .reduce((acc, c) => acc + c.amount, 0);

  const totalDoubledCount = commissions.filter((c) => c.isDoubled).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Controle de Comissões & Metas</h1>
            <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Meta Dobrada (2x)
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Acompanhamento de metas de vendas com dobramento automático de comissão ao atingir o objetivo
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Relatório</span>
        </button>
      </div>

      {/* PAINEL DE METAS DOS VENDEDORES NO MÊS */}
      {goalsSummary.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/30">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Metas dos Vendedores ({monthLabel || 'Mês Atual'})</h2>
                <p className="text-xs text-slate-400">Ao atingir 100% da meta, a comissão do vendedor é dobrada (2x) automaticamente</p>
              </div>
            </div>
            {isManagerOrAdmin && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                Gerencie valores de metas no menu Usuários
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goalsSummary.map((seller) => {
              const hasGoal = seller.monthlyGoal > 0;
              const isReached = seller.goalReached;

              return (
                <div
                  key={seller.sellerId}
                  className={`p-5 rounded-2xl border transition-all ${
                    isReached
                      ? 'bg-gradient-to-br from-emerald-50 via-amber-50 to-emerald-50 border-emerald-300 shadow-md shadow-emerald-500/10'
                      : hasGoal
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-50/60 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{seller.sellerName}</h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {seller.salesCount} {seller.salesCount === 1 ? 'venda no mês' : 'vendas no mês'}
                        {isManagerOrAdmin && ` • Taxa: ${seller.commissionRate}%`}
                      </p>
                    </div>
                    {isReached ? (
                      <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-sm flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-300" /> 2x DOBRADA!
                      </span>
                    ) : hasGoal ? (
                      <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-xs font-bold">
                        {seller.progressPercent}%
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium italic">Sem meta</span>
                    )}
                  </div>

                  {hasGoal ? (
                    <div className="mt-3 space-y-2">
                      {/* Barra de Progresso */}
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isReached
                              ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, seller.progressPercent)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">
                          Vendido: <strong className="text-slate-900">{formatCurrency(seller.monthSales)}</strong>
                        </span>
                        <span className="text-slate-500">
                          Meta: <strong>{formatCurrency(seller.monthlyGoal)}</strong>
                        </span>
                      </div>

                      <div className="pt-1">
                        {isReached ? (
                          <p className="text-xs font-black text-emerald-700 flex items-center gap-1.5 bg-emerald-100/70 p-2 rounded-xl border border-emerald-200">
                            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>Meta batida! Todas as vendas deste mês ganham comissão em dobro (2x)!</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-600 font-semibold bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                            <span>Faltam para bater:</span>
                            <span className="font-bold text-blue-700">{formatCurrency(seller.remainingToGoal)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-center py-3 bg-white rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500">Vendas no mês: <strong className="text-slate-800">{formatCurrency(seller.monthSales)}</strong></p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Cadastre uma meta no menu Usuários para ativar comissão dobrada</p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Comissão acumulada:</span>
                    <span className="font-black text-purple-700">
                      {formatCurrency(seller.pendingCommission + seller.paidCommission)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Total Pendente a Pagar</span>
          <p className="text-3xl font-black text-purple-900 mt-2">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-slate-400 mt-1">Aguardando fechamento com os vendedores</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Já Pago</span>
          <p className="text-3xl font-black text-emerald-700 mt-2">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-slate-400 mt-1">Comissões liquidadas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Comissões Dobradas (2x)</span>
          <p className="text-3xl font-black text-amber-700 mt-2">{totalDoubledCount}</p>
          <p className="text-xs text-slate-400 mt-1">Vendas bonificadas por metas batidas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filtrar por Vendedor</label>
          <select
            value={selectedSellerId}
            onChange={(e) => setSelectedSellerId(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="">Todos os Vendedores</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {isManagerOrAdmin ? `(${s.commissionRate}%)` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="">Todos os Status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
          </select>
        </div>
      </div>

      {/* Tabela de Comissões */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Venda #</th>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4">Vendedor</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4 text-right">Valor Venda</th>
                {isManagerOrAdmin && <th className="py-3.5 px-4 text-right">Taxa %</th>}
                <th className="py-3.5 px-4 text-center">Tipo / Meta</th>
                <th className="py-3.5 px-4 text-right">Comissão</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isManagerOrAdmin ? 10 : 9} className="text-center py-10 text-slate-400">
                    Carregando comissões...
                  </td>
                </tr>
              ) : commissions.length === 0 ? (
                <tr>
                  <td colSpan={isManagerOrAdmin ? 10 : 9} className="text-center py-10 text-slate-400">
                    Nenhuma comissão encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                commissions.map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.isDoubled ? 'bg-amber-50/20' : ''}`}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      #{c.sale?.id}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 text-xs">
                      {c.seller?.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {c.sale?.customer?.name || 'Consumidor Final'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500">
                      {formatCurrency(c.sale?.total)}
                    </td>
                    {isManagerOrAdmin && (
                      <td className="py-3 px-4 text-right text-xs font-semibold text-slate-700">
                        {c.rate}%
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      {c.isDoubled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-100 to-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                          <Sparkles className="w-3 h-3 text-amber-600" /> 2x Dobrada
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">1x Padrão</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-black text-sm text-purple-700">
                        {formatCurrency(c.amount)}
                      </div>
                      {c.isDoubled && c.originalAmount && (
                        <div className="text-[10px] text-slate-400 line-through">
                          Original: {formatCurrency(c.originalAmount)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          c.status === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status === 'PENDENTE' && (
                        <button
                          onClick={() => handlePayCommission(c.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-200 transition-colors"
                        >
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
