'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowUpCircle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Calendar,
  X,
  User,
  CreditCard,
} from 'lucide-react';

export default function ContasReceberPage() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    totalInstallments: 1,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/accounts-receivable?status=${statusFilter}` : '/api/accounts-receivable';
      const [resRec, resCust] = await Promise.all([
        fetch(url),
        fetch('/api/customers'),
      ]);

      if (resRec.ok) setReceivables(await resRec.json());
      if (resCust.ok) setCustomers(await resCust.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/accounts-receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowNewModal(false);
        setFormData({
          customerId: '',
          amount: '',
          dueDate: new Date().toISOString().split('T')[0],
          totalInstallments: 1,
          notes: '',
        });
        loadData();
      } else {
        const err = await res.json();
        alert('Erro ao criar: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReceive = async (id: string) => {
    if (!confirm('Confirmar o recebimento desta parcela?')) return;
    try {
      const res = await fetch('/api/accounts-receivable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'RECEIVE' }),
      });
      if (res.ok) {
        loadData();
      } else {
        alert('Erro ao dar baixa');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const totalPending = receivables
    .filter((r) => r.status === 'PENDENTE' || r.status === 'ATRASADO')
    .reduce((acc, r) => acc + r.amount, 0);

  const totalOverdue = receivables
    .filter((r) => r.status === 'ATRASADO')
    .reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contas a Receber (Crediário)</h1>
          <p className="text-sm text-slate-500">Controle de títulos de clientes, parcelas de vendas a prazo e quitações</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Lançar Título Avulso</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total a Receber</span>
          <p className="text-3xl font-black text-indigo-700 mt-2">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-slate-400 mt-1">Valores a prazo de crediário</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Total em Atraso</span>
          <p className="text-3xl font-black text-rose-600 mt-2">{formatCurrency(totalOverdue)}</p>
          <p className="text-xs text-rose-500 font-semibold mt-1">Clientes inadimplentes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {['', 'PENDENTE', 'ATRASADO', 'PAGO'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === st
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === '' ? 'Todas' : st}
          </button>
        ))}
      </div>

      {/* Tabela de Recebíveis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Origem / Venda</th>
                <th className="py-3.5 px-4 text-center">Parcela</th>
                <th className="py-3.5 px-4">Vencimento</th>
                <th className="py-3.5 px-4 text-right">Valor</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Carregando títulos...
                  </td>
                </tr>
              ) : receivables.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Nenhum título a receber encontrado.
                  </td>
                </tr>
              ) : (
                receivables.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {r.customer?.name}
                      {r.customer?.phone && (
                        <p className="text-[11px] font-normal text-slate-400">{r.customer.phone}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                      {r.sale ? `Venda #${r.sale.id}` : 'Avulso'}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-bold text-slate-700">
                      {r.installmentNumber} / {r.totalInstallments}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                      {new Date(r.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-indigo-700">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          r.status === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-700'
                            : r.status === 'ATRASADO'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status !== 'PAGO' && (
                        <button
                          onClick={() => handleReceive(r.id)}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-200 transition-colors"
                        >
                          Receber
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

      {/* MODAL DE NOVO TÍTULO AVULSO */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800">Lançar Título a Receber</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReceivable} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Cliente *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Selecione o Cliente</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.cpfCnpj ? `(${c.cpfCnpj})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Ex: Nota promissória / Acordo de crediário"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white shadow"
                >
                  Salvar Título
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

