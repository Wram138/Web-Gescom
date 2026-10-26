'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  AlertOctagon,
  Calendar,
  User,
  ShoppingBag,
  X,
  Printer,
  CheckCircle,
} from 'lucide-react';

export default function VendasPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales?limit=100');
      if (res.ok) {
        setSales(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (sale: any) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  const handleOpenCancel = (sale: any) => {
    setSelectedSale(sale);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedSale) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: selectedSale.id,
          reason: cancelReason,
        }),
      });

      if (res.ok) {
        setShowCancelModal(false);
        setShowDetailModal(false);
        loadSales();
        alert(`Venda #${selectedSale.id} cancelada e estoque estornado com sucesso!`);
      } else {
        const err = await res.json();
        alert('Erro ao cancelar: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.id.toString().includes(q) ||
      (s.customer && s.customer.name.toLowerCase().includes(q)) ||
      (s.seller && s.seller.name.toLowerCase().includes(q)) ||
      (s.paymentMethod && s.paymentMethod.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Histórico de Vendas & Cupons</h1>
          <p className="text-sm text-slate-500">Consulte todas as operações realizadas no PDV, detalhes e cancelamentos</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Buscar por cupom #, cliente ou vendedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Cupom</th>
                <th className="py-3.5 px-4">Data & Hora</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Vendedor</th>
                <th className="py-3.5 px-4">Pagamento</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Carregando vendas...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      #{s.id}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(s.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {s.customer?.name || 'Consumidor Final'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {s.seller?.name || 'Venda Balcão'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(s.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          s.status === 'CONCLUIDA'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenDetail(s)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalhes do Cupom"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {s.status === 'CONCLUIDA' && (
                        <button
                          onClick={() => handleOpenCancel(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Cancelar Venda e Estornar Estoque"
                        >
                          <AlertOctagon className="w-4 h-4" />
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

      {/* MODAL DE DETALHES DA VENDA */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Cupom de Venda #{selectedSale.id}</h3>
                <p className="text-xs text-slate-500">{new Date(selectedSale.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <p><strong className="text-slate-600">Cliente:</strong> {selectedSale.customer?.name || 'Consumidor Final'}</p>
              <p><strong className="text-slate-600">Operador:</strong> {selectedSale.cashier?.name}</p>
              <p><strong className="text-slate-600">Vendedor:</strong> {selectedSale.seller?.name || 'Direta'}</p>
              <p><strong className="text-slate-600">Status:</strong> {selectedSale.status}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Itens da Venda</h4>
              <div className="space-y-1 text-xs border rounded-xl divide-y">
                {selectedSale.items?.map((item: any) => (
                  <div key={item.id} className="p-2.5 flex justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{item.productName}</p>
                      <p className="text-[10px] text-slate-400">{item.quantity}x {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Desconto:</span>
                <span>{formatCurrency(selectedSale.discount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-slate-900 pt-1 border-t">
                <span>Total:</span>
                <span className="text-emerald-600">{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="py-2.5 px-4 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CANCELAMENTO */}
      {showCancelModal && selectedSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertOctagon className="w-8 h-8" />
              <div>
                <h3 className="font-bold text-base text-slate-900">Cancelar Venda #{selectedSale.id}?</h3>
                <p className="text-xs text-rose-600 font-medium">Os itens serão devolvidos ao estoque e comissões estornadas.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Motivo do Cancelamento</label>
              <input
                type="text"
                placeholder="Ex: Desistência do cliente / Erro no registro"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-xs"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-white shadow text-xs"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

