'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  Package,
  PlusCircle,
  Percent,
  Smartphone,
  Calendar,
  DollarSign,
  Award,
  BarChart3,
  PieChart,
  ShieldCheck,
  Printer,
  Sparkles,
  ArrowRight,
  CreditCard,
  QrCode,
  Banknote,
  Users,
} from 'lucide-react';

export default function DashboardAdminPage() {
  const { user, canAccess } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('30days'); // today, 7days, month, 30days
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Redireciona usuários sem permissão de dashboard (ex: operadores de caixa ou vendedores restritos)
  useEffect(() => {
    if (user && !canAccess('dashboard')) {
      router.push('/pdv');
    }
  }, [user, canAccess, router]);

  useEffect(() => {
    fetchDashboard(period);
  }, [period]);

  const fetchDashboard = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?period=${selectedPeriod}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Cálculo de escala para o gráfico de faturamento diário
  const dailyChart = data?.dailyChartData || [];
  const maxDayTotal = Math.max(...dailyChart.map((d: any) => d.total), 1);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-sm font-semibold text-slate-500">Carregando inteligência de negócios do Web-Gescom...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sugestão de Terminal Mobile ao acessar de Smartphone */}
      <div className="md:hidden bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-sm flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-5 h-5 text-emerald-200 flex-shrink-0" />
          <div>
            <p className="font-bold">Acessando pelo Celular?</p>
            <p className="text-[11px] text-emerald-100">Use o Terminal de Bolso para lançar pré-vendas</p>
          </div>
        </div>
        <Link
          href="/mobile"
          className="px-3 py-1.5 bg-white text-emerald-800 font-extrabold rounded-xl shadow text-xs whitespace-nowrap active:scale-95"
        >
          Ir p/ Mobile
        </Link>
      </div>

      {/* Top Banner / Cabeçalho Executivo do Admin */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Executivo</h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Painel do Administrador
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Análise comercial em tempo real, lucratividade, produtos mais vendidos e fluxo financeiro
          </p>
        </div>

        {/* Controles de Período e Ações */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Período */}
          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === '7days' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === '30days' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              30 Dias
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            title="Imprimir Relatório Executivo"
          >
            <Printer className="w-4 h-4" />
          </button>

          <Link
            href="/pdv"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Frente de Caixa</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Executivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento do Período */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento ({period === 'today' ? 'Hoje' : period === '7days' ? '7 Dias' : period === 'month' ? 'Este Mês' : '30 Dias'})</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(data?.periodStats?.totalSales)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>{data?.periodStats?.countSales || 0} cupons emitidos</span>
            <span className="font-semibold text-blue-600">
              Médio: {formatCurrency(data?.periodStats?.averageTicket)}
            </span>
          </div>
        </div>

        {/* Lucro Bruto Estimado */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lucro Bruto Estimado</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {formatCurrency(data?.periodStats?.estimatedProfit)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">CMV: {formatCurrency(data?.periodStats?.totalCost)}</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
              {data?.periodStats?.profitMarginPercent || 0}% margem
            </span>
          </div>
        </div>

        {/* Contas a Receber */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">A Receber (Crediário)</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">
            {formatCurrency(data?.financial?.totalToReceive)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Total a liquidar</span>
            {data?.financial?.totalReceivablesOverdue > 0 ? (
              <span className="font-bold text-rose-600">
                {formatCurrency(data?.financial?.totalReceivablesOverdue)} vencido
              </span>
            ) : (
              <span className="font-bold text-emerald-600">Sem atrasos</span>
            )}
          </div>
        </div>

        {/* Contas a Pagar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contas a Pagar</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            {formatCurrency(data?.financial?.totalToPay)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Despesas e Fornecedores</span>
            {data?.financial?.totalPayablesOverdue > 0 ? (
              <span className="font-bold text-rose-700">
                {formatCurrency(data?.financial?.totalPayablesOverdue)} atrasado
              </span>
            ) : (
              <span className="font-bold text-emerald-600">Em dia</span>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO 1: Faturamento Diário (SVG Bar & Trend Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Evolução de Vendas no Período</h2>
                <p className="text-xs text-slate-400">Faturamento diário registrado no PDV</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl">
              Pico: {formatCurrency(maxDayTotal)}
            </span>
          </div>

          {dailyChart.length === 0 || maxDayTotal <= 1 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
              <BarChart3 className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-xs">Nenhum faturamento registrado no período selecionado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Área do Gráfico de Barras com Tooltip */}
              <div className="h-56 flex items-end gap-1 sm:gap-2 pt-6 px-1 relative">
                {dailyChart.map((d: any, idx: number) => {
                  const heightPercent = Math.max(4, Math.round((d.total / maxDayTotal) * 100));
                  const isHovered = hoveredBarIndex === idx;

                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {/* Tooltip flutuante */}
                      {isHovered && (
                        <div className="absolute -top-16 z-30 bg-slate-900 text-white text-[11px] font-bold p-2.5 rounded-xl shadow-xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 left-1/2 animate-fadeIn border border-slate-700">
                          <p className="text-slate-300">{d.label} ({d.dayName})</p>
                          <p className="text-emerald-400 text-xs font-black">{formatCurrency(d.total)}</p>
                          <p className="text-[10px] text-slate-400">{d.count} {d.count === 1 ? 'venda' : 'vendas'} • Lucro: {formatCurrency(d.profit)}</p>
                        </div>
                      )}

                      {/* Barra de Faturamento */}
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          d.total > 0
                            ? isHovered
                              ? 'bg-blue-700 shadow-md shadow-blue-500/30'
                              : 'bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600'
                            : 'bg-slate-100'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />

                      {/* Rótulo do Eixo X (Data) */}
                      <span className="text-[10px] text-slate-400 mt-2 font-medium truncate w-full text-center">
                        {dailyChart.length > 15 ? (idx % 3 === 0 ? d.label : '') : d.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span>
                  <span>Faturamento Diário</span>
                </span>
                <span>Passe o mouse sobre as barras para ver detalhes</span>
              </div>
            </div>
          )}
        </div>

        {/* GRÁFICO 2: Formas de Pagamento (Distribuição Financeira) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Formas de Pagamento</h2>
                <p className="text-xs text-slate-400">Divisão de faturamento por método</p>
              </div>
            </div>
          </div>

          {/* Barra de Distribuição Segmentada */}
          {data?.paymentDistribution?.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-center">
              <CreditCard className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-xs">Nenhum pagamento registrado no período.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full bg-slate-100 rounded-2xl h-4 overflow-hidden flex shadow-inner">
                {data?.paymentDistribution?.map((p: any) => (
                  <div
                    key={p.method}
                    style={{ width: `${p.percent}%`, backgroundColor: p.color }}
                    className="h-full transition-all duration-500 hover:opacity-90"
                    title={`${p.label}: ${p.percent}% (${formatCurrency(p.amount)})`}
                  />
                ))}
              </div>

              {/* Lista dos métodos com valores e porcentagens */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {data?.paymentDistribution?.map((p: any) => (
                  <div
                    key={p.method}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-md flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <div>
                        <p className="font-bold text-slate-800">{p.label}</p>
                        <p className="text-[10px] text-slate-400">{p.count} pagamentos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{formatCurrency(p.amount)}</p>
                      <p className="text-[11px] font-bold text-slate-500">{p.percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🏆 SEÇÃO: PRODUTOS MAIS VENDIDOS (RANKING PRINCIPAL) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Award className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>Top Produtos Mais Vendidos</span>
                <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2 py-0.5 rounded-lg border border-amber-300">
                  Ranking
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Produtos com maior saída, volume de faturamento e margem de contribuição no período
              </p>
            </div>
          </div>
          <Link
            href="/produtos"
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span>Ver todo o catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {data?.topProducts?.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Nenhum produto vendido no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Qtd Vendida</th>
                  <th className="py-3 px-4 text-right">Faturamento</th>
                  {isManagerOrAdmin && <th className="py-3 px-4 text-right">Lucro Bruto</th>}
                  {isManagerOrAdmin && <th className="py-3 px-4 text-center">Margem</th>}
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.topProducts?.map((p: any, idx: number) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  return (
                    <tr key={p.productId} className="hover:bg-slate-50 transition-colors">
                      {/* Posição no Ranking */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs mx-auto shadow-sm ${
                            isTop1
                              ? 'bg-amber-400 text-amber-950 shadow-amber-400/30'
                              : isTop2
                              ? 'bg-slate-300 text-slate-800'
                              : isTop3
                              ? 'bg-amber-700/80 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}º
                        </span>
                      </td>

                      {/* Nome do Produto */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{p.name}</span>
                          {isTop1 && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                              Mais Vendido 🔥
                            </span>
                          )}
                        </div>
                        {p.code && <p className="text-[11px] font-mono text-slate-400 font-normal">Cód: {p.code}</p>}
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-4 text-xs">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-semibold">
                          {p.categoryName}
                        </span>
                      </td>

                      {/* Quantidade Vendida */}
                      <td className="py-3 px-4 text-center font-black text-slate-800 text-sm">
                        {p.quantitySold} <span className="text-[11px] font-normal text-slate-400">{p.unit}</span>
                      </td>

                      {/* Faturamento Gerado */}
                      <td className="py-3 px-4 text-right font-black text-blue-600 text-sm">
                        {formatCurrency(p.totalRevenue)}
                      </td>

                      {/* Lucro Bruto (Apenas Admin/Gerente) */}
                      {isManagerOrAdmin && (
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 text-xs">
                          {formatCurrency(p.profit)}
                        </td>
                      )}

                      {/* Margem % (Apenas Admin/Gerente) */}
                      {isManagerOrAdmin && (
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                              p.margin >= 40
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.margin >= 20
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.margin}%
                          </span>
                        </td>
                      )}

                      {/* Estoque Atual */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-xl font-bold inline-flex items-center gap-1 ${
                            p.stockQuantity <= p.minStock
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.stockQuantity} {p.unit}
                          {p.stockQuantity <= p.minStock && (
                            <span className="text-[10px] text-rose-600 font-black">⚠️ Baixo</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SEÇÃO INFERIOR: RANKING DE VENDEDORES & ESTOQUE CRÍTICO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desempenho dos Vendedores no Período */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Desempenho Comercial dos Vendedores</h2>
                <p className="text-xs text-slate-400">Total vendido e progresso da meta</p>
              </div>
            </div>
            <Link href="/comissoes" className="text-xs font-bold text-blue-600 hover:text-blue-800">
              Ver Metas & Comissões
            </Link>
          </div>

          {data?.topSellers?.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">Nenhuma venda vinculada a vendedor no período.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.topSellers?.map((seller: any) => (
                <div
                  key={seller.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900">{seller.name}</p>
                      {seller.goalReached && (
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3 text-amber-300" /> Meta Batida (2x)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {seller.count} vendas • Meta:{' '}
                      {seller.monthlyGoal > 0 ? formatCurrency(seller.monthlyGoal) : 'Não configurada'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-indigo-700">{formatCurrency(seller.totalSales)}</p>
                    {seller.monthlyGoal > 0 && (
                      <p className="text-[11px] font-bold text-slate-500">{seller.progressPercent}% da meta</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerta de Reposição & Giro de Estoque */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Alerta de Reposição de Estoque</h2>
                <p className="text-xs text-slate-400">Itens com estoque abaixo ou igual ao mínimo</p>
              </div>
            </div>
            <Link
              href="/produtos"
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Gerenciar ({data?.inventory?.lowStockCount})
            </Link>
          </div>

          {data?.inventory?.lowStockCount === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-xs font-bold text-emerald-700">Tudo em ordem!</p>
              <p className="text-[11px] text-slate-400">Nenhum produto está abaixo do estoque mínimo.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data?.inventory?.lowStockItems?.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 border border-amber-200"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.category?.name || 'Geral'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-600">
                      {p.stockQuantity} {p.unit}
                    </span>
                    <p className="text-[10px] text-slate-400">Mínimo: {p.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
