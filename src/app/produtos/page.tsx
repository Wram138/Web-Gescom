'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Edit2,
  Trash2,
  TrendingUp,
  Tag,
  Boxes,
  X,
  Check,
} from 'lucide-react';

function ProdutosContent() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';
  const searchParams = useSearchParams();
  const lowStockParam = searchParams.get('lowStock') === 'true';

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(lowStockParam);

  // Modais
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<any>(null);

  // Form Produto
  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    description: '',
    unit: 'UN',
    categoryId: '',
    supplierId: '',
    costPrice: 0,
    salePrice: 0,
    stockQuantity: 0,
    minStock: 5,
    commissionRate: '',
  });

  // Form Movimento Estoque
  const [stockMovementData, setStockMovementData] = useState({
    type: 'ENTRADA',
    quantity: 1,
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, [filterLowStock]);

  const loadData = async () => {
    setLoading(true);
    try {
      const url = filterLowStock ? '/api/products?lowStock=true' : '/api/products';
      const [resProd, resCat, resSup] = await Promise.all([
        fetch(url),
        fetch('/api/categories'),
        fetch('/api/suppliers'),
      ]);

      if (resProd.ok) setProducts(await resProd.json());
      if (resCat.ok) setCategories(await resCat.json());
      if (resSup.ok) setSuppliers(await resSup.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({
      code: `PROD-${Date.now().toString().slice(-4)}`,
      barcode: '',
      name: '',
      description: '',
      unit: 'UN',
      categoryId: categories[0]?.id || '',
      supplierId: suppliers[0]?.id || '',
      costPrice: 0,
      salePrice: 0,
      stockQuantity: 0,
      minStock: 5,
      commissionRate: '',
    });
    setShowProductModal(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setFormData({
      code: prod.code || '',
      barcode: prod.barcode || '',
      name: prod.name,
      description: prod.description || '',
      unit: prod.unit || 'UN',
      categoryId: prod.categoryId || '',
      supplierId: prod.supplierId || '',
      costPrice: prod.costPrice,
      salePrice: prod.salePrice,
      stockQuantity: prod.stockQuantity,
      minStock: prod.minStock,
      commissionRate: prod.commissionRate !== null ? prod.commissionRate.toString() : '',
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const payload = editingProduct ? { id: editingProduct.id, ...formData } : formData;

      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowProductModal(false);
        loadData();
      } else {
        const err = await res.json();
        alert('Erro ao salvar produto: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpenStockMovement = (prod: any) => {
    setSelectedProductForStock(prod);
    setStockMovementData({
      type: 'ENTRADA',
      quantity: 1,
      reason: 'Reposição de estoque',
    });
    setShowStockModal(true);
  };

  const handleSaveStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForStock) return;

    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductForStock.id,
          type: stockMovementData.type,
          quantity: Number(stockMovementData.quantity),
          reason: stockMovementData.reason,
        }),
      });

      if (res.ok) {
        setShowStockModal(false);
        loadData();
      } else {
        const err = await res.json();
        alert('Erro no movimento: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de Estoque & Produtos</h1>
          <p className="text-sm text-slate-500">Gestão de catálogo, custos, preços de venda e alertas de reposição</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Cadastrar Novo Produto</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome, código ou EAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              filterLowStock
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Apenas Estoque Baixo</span>
          </button>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Código / EAN</th>
                <th className="py-3.5 px-4">Nome do Produto</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4 text-right">Custo</th>
                <th className="py-3.5 px-4 text-right">Preço Venda</th>
                <th className="py-3.5 px-4 text-right">Margem</th>
                <th className="py-3.5 px-4 text-center">Saldo Estoque</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Carregando produtos...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stockQuantity <= p.minStock;
                  const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-slate-800">{p.code || '—'}</span>
                        {p.barcode && <p className="font-mono text-[11px] text-slate-400">{p.barcode}</p>}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.name}
                        {p.description && (
                          <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                            {p.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                          {p.category?.name || 'Geral'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-slate-500 font-medium">
                        {formatCurrency(p.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(p.salePrice)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-xs font-bold ${margin >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            isLow
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stockQuantity} {p.unit}
                          {isLow && <AlertTriangle className="w-3 h-3" />}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenStockMovement(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          title="Lançar Entrada / Saída de Estoque"
                        >
                          Movimentar
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Produto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTO */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="Ex: Coca-Cola 2L"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Código de Barras (EAN)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    placeholder="Ex: 7891000100101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Código Interno / SKU</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    placeholder="Ex: PROD-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Categoria</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Sem Categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fornecedor</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Sem Fornecedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-emerald-500 text-emerald-800 font-black text-base"
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Estoque Inicial</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Unidade</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilo (KG)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="PC">Peça (PC)</option>
                    <option value="LT">Litro (LT)</option>
                  </select>
                </div>

                {isManagerOrAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Comissão Específica % (Opcional)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Padrão do Vendedor"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE MOVIMENTAÇÃO DE ESTOQUE */}
      {showStockModal && selectedProductForStock && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-800">Movimentar Estoque</h3>
                <p className="text-xs text-slate-500">{selectedProductForStock.name}</p>
              </div>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border text-xs flex justify-between">
              <span>Saldo Atual:</span>
              <span className="font-extrabold text-slate-900">
                {selectedProductForStock.stockQuantity} {selectedProductForStock.unit}
              </span>
            </div>

            <form onSubmit={handleSaveStockMovement} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Movimento</label>
                <select
                  value={stockMovementData.type}
                  onChange={(e) => setStockMovementData({ ...stockMovementData, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold"
                >
                  <option value="ENTRADA">Entrada (Compra / Reposição)</option>
                  <option value="SAIDA">Saída Avulsa</option>
                  <option value="PERDA">Perda / Avaria</option>
                  <option value="AJUSTE">Ajuste de Balanço (Novo Saldo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {stockMovementData.type === 'AJUSTE' ? 'Novo Saldo Real' : 'Quantidade'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={stockMovementData.quantity}
                  onChange={(e) => setStockMovementData({ ...stockMovementData, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motivo / Observação</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nota fiscal 1234 / Avaria no transporte"
                  value={stockMovementData.reason}
                  onChange={(e) => setStockMovementData({ ...stockMovementData, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white shadow"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProdutosPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Carregando catálogo...</div>}>
      <ProdutosContent />
    </Suspense>
  );
}
