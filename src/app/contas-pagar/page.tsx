'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowDownCircle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Calendar,
  X,
  CreditCard,
  Building,
} from 'lucide-react';

export default function ContasPagarPage() {
  const [payables, setPayables] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    supplierId: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    category: 'Despesa Operacional',
    paymentMethod: 'BOLETO',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/accounts-payable?status=${statusFilter}` : '/api/accounts-payable';
      const [resPay, resSup] = await Promise.all([
        fetch(url),
        fetch('/api/suppliers'),
      ]);

      if (resPay.ok) setPayables(await resPay.json());
      if (resSup.ok) setSuppliers(await resSup.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/accounts-payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowNewModal(false);
        setFormData({
          description: '',
          supplierId: '',
          amount: '',
          dueDate: new Date().toISOString().split('T')[0],
          category: 'Despesa Operacional',
          paymentMethod: 'BOLETO',
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

  const handlePay = async (id: string) => {
    if (!confirm('Confirmar o pagamento desta conta?')) return;
    try {
      const res = await fetch('/api/accounts-payable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'PAY' }),
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

  const totalPending = payables
    .filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADO')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalOverdue = payables
    .filter((p) => p.status === 'ATRASADO')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contas a Pagar</h1>
          <p className="text-sm text-slate-500">Controle de duplicatas, despesas fixas, compras e quitações</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-rose-600/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Lançar Nova Conta a Pagar</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total em Aberto</span>
          <p className="text-3xl font-black text-rose-600 mt-2">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-slate-400 mt-1">Soma de todas as despesas pendentes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Total Vencido (Atrasado)</span>
          <p className="text-3xl font-black text-rose-800 mt-2">{formatCurrency(totalOverdue)}</p>
          <p className="text-xs text-rose-500 font-semibold mt-1">Atenção para evitar juros e multas</p>
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

      {/* Tabela de Contas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Descrição</th>
                <th className="py-3.5 px-4">Fornecedor</th>
                <th className="py-3.5 px-4">Categoria</th>
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
                    Carregando contas...
                  </td>
                </tr>
              ) : payables.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Nenhuma conta a pagar encontrada.
                  </td>
                </tr>
              ) : (
                payables.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {p.description}
                      {p.notes && <p className="text-[11px] font-normal text-slate-400">{p.notes}</p>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {p.supplier?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                        {p.category || 'Geral'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                      {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          p.status === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.status === 'ATRASADO'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status !== 'PAGO' && (
                        <button
                          onClick={() => handlePay(p.id)}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-200 transition-colors"
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

      {/* MODAL DE NOVA CONTA A PAGAR */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800">Lançar Conta a Pagar</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayable} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Descrição / Título *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de Mercadoria / Aluguel"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fornecedor (Opcional)</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Sem Fornecedor Vinculado</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Valor (R$) *</label>
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
                <label className="block text-xs font-bold text-slate-600 mb-1">Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Despesa Fixa, Compra Fornecedor"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-white shadow"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

