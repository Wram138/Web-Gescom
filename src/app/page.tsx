'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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

      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel Geral de Gestão</h1>
          <p className="text-sm text-slate-500">Resumo comercial, estoque e fluxo financeiro em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pdv"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Abrir Frente de Caixa (PDV)</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendas Hoje */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas Hoje</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-3">
            {formatCurrency(data?.salesToday?.total)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>{data?.salesToday?.count || 0} cupons emitidos</span>
            <span className="font-semibold text-blue-600">
              Médio: {formatCurrency(data?.salesToday?.averageTicket)}
            </span>
          </div>
        </div>

        {/* Vendas do Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturamento Mês</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-3">
            {formatCurrency(data?.salesMonth?.total)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {data?.salesMonth?.count || 0} vendas realizadas no mês
          </p>
        </div>

        {/* Contas a Receber */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">A Receber (Crediário)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-700 mt-3">
            {formatCurrency(data?.financial?.totalToReceive)}
          </p>
          <p className="text-xs text-rose-500 font-semibold mt-2">
            {formatCurrency(data?.financial?.totalReceivablesOverdue)} vencido
          </p>
        </div>

        {/* Contas a Pagar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contas a Pagar</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 mt-3">
            {formatCurrency(data?.financial?.totalToPay)}
          </p>
          <p className="text-xs text-rose-600 font-semibold mt-2">
            {formatCurrency(data?.financial?.totalPayablesOverdue)} vencido
          </p>
        </div>
      </div>

      {/* Secondary Row: Estoque & Comissões */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerta de Estoque Mínimo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-800">Alerta de Reposição</h2>
            </div>
            <Link
              href="/produtos?lowStock=true"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Ver todos ({data?.inventory?.lowStockCount})
            </Link>
          </div>

          {data?.inventory?.lowStockCount === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-xs">Todos os produtos estão com estoque adequado!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.inventory?.lowStockItems?.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200/60"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{p.name}</p>
                    <p className="text-[11px] text-slate-500">{p.category?.name || 'Geral'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-rose-600">
                      {p.stockQuantity} {p.unit}
                    </span>
                    <p className="text-[10px] text-slate-400">Mín: {p.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo Financeiro & Comissões */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-800">Comissões Pendentes</h2>
            </div>
            <Link href="/comissoes" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              Gerenciar
            </Link>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200/80 mb-4">
            <span className="text-xs font-medium text-purple-700">Total a Pagar aos Vendedores</span>
            <p className="text-2xl font-black text-purple-900 mt-1">
              {formatCurrency(data?.financial?.totalPendingCommissions)}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Produtos Cadastrados</span>
              <span className="font-bold text-slate-800">{data?.inventory?.totalProducts} itens</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Caixa Atual</span>
              <span className={`font-bold ${data?.activeCashRegister ? 'text-emerald-600' : 'text-slate-500'}`}>
                {data?.activeCashRegister ? `Aberto (${data.activeCashRegister.user.name})` : 'Fechado'}
              </span>
            </div>
          </div>
        </div>

        {/* Últimas Vendas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-800">Últimas Vendas</h2>
            </div>
            <Link href="/vendas" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              Ver histórico
            </Link>
          </div>

          {data?.recentSales?.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {data?.recentSales?.map((sale: any) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800">Venda #{sale.id}</span>
                    <p className="text-[11px] text-slate-400">
                      {sale.customer?.name || 'Consumidor'} • {sale.seller?.name || 'Balcão'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600">
                      {formatCurrency(sale.total)}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
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

