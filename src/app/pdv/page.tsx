'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Printer,
  User,
  ShoppingBag,
  CreditCard,
  QrCode,
  Banknote,
  Calendar,
  AlertCircle,
  AlertTriangle,
  X,
  ArrowRight,
  Sparkles,
  Clock,
  Award,
  Smartphone,
  Inbox,
  Copy,
} from 'lucide-react';

interface CartItem {
  id: string;
  code: string;
  barcode: string;
  name: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discount: number;
  total: number;
  commissionRate: number | null;
  stockQuantity: number;
}

export default function PDVPage() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  // Estados dos dados
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [activeRegister, setActiveRegister] = useState<any>(null);
  const [cashRegisterSummary, setCashRegisterSummary] = useState<any>(null);

  // Estados da Venda Atual
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Busca e Seleção Rápida
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  // Modais
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState<string>('DINHEIRO');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [installments, setInstallments] = useState<number>(1);

  // Comandas / Pré-Venda Mobile
  const [showPreSalesModal, setShowPreSalesModal] = useState(false);
  const [pendingPreSales, setPendingPreSales] = useState<any[]>([]);
  const [loadedPreSaleId, setLoadedPreSaleId] = useState<number | null>(null);
  const [showMobileConnectModal, setShowMobileConnectModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadPendingPreSales = async () => {
    try {
      const res = await fetch('/api/pre-sales?status=PENDENTE');
      if (res.ok) {
        const data = await res.json();
        setPendingPreSales(data);
        setShowPreSalesModal(true);
      }
    } catch { }
  };

  const handleImportPreSale = (preSale: any) => {
    const newItems: CartItem[] = [];
    for (const it of preSale.items) {
      const prod = products.find((p) => p.id === it.productId) || it.product;
      if (prod) {
        newItems.push({
          id: prod.id,
          code: prod.code || '',
          barcode: prod.barcode || '',
          name: prod.name,
          unit: prod.unit || 'UN',
          unitPrice: it.unitPrice,
          costPrice: prod.costPrice || 0,
          quantity: it.quantity,
          discount: it.discount || 0,
          total: it.total,
          commissionRate: prod.commissionRate,
          stockQuantity: prod.stockQuantity || 0,
        });
      }
    }

    setCart(newItems);
    if (preSale.sellerId) setSelectedSellerId(preSale.sellerId);
    if (preSale.customerId) setSelectedCustomerId(preSale.customerId);
    setDiscountTotal(preSale.discount || 0);
    setLoadedPreSaleId(preSale.id);
    setShowPreSalesModal(false);
  };

  const handleCancelPreSale = async (id: number) => {
    if (!confirm('Deseja realmente cancelar esta comanda de pré-venda?')) return;
    try {
      const res = await fetch('/api/pre-sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'CANCELAR' }),
      });
      if (res.ok) {
        setPendingPreSales((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {}
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  useEffect(() => {
    // Foca na busca ao abrir a tela
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Atalhos de teclado (F2, F4, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (!activeRegister) {
          alert('Não é permitido realizar vendas sem um turno de caixa aberto. Abra o caixa primeiro no menu Turno de Caixa.');
          return;
        }
        if (cashRegisterSummary?.summary?.isFromPreviousDay) {
          alert(`O caixa atual é de um dia anterior (${cashRegisterSummary.summary.openedDateFormatted}) e deve ser fechado obrigatoriamente antes de iniciar as vendas de hoje.`);
          return;
        }
        if (cart.length > 0 && !showCheckoutModal) {
          setShowCheckoutModal(true);
        }
      } else if (e.key === 'Escape') {
        if (showCheckoutModal) setShowCheckoutModal(false);
        else if (showReceiptModal) setShowReceiptModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showCheckoutModal, showReceiptModal]);

  const loadInitialData = async () => {
    try {
      // 1. Produtos
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) setProducts(await prodRes.json());

      // 2. Clientes
      const custRes = await fetch('/api/customers');
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData);
        if (custData.length > 0) setSelectedCustomerId(custData[0].id);
      }

      // 3. Usuários / Vendedores
      const userRes = await fetch('/api/users');
      if (userRes.ok) {
        const usersData = await userRes.json();
        setSellers(usersData);
        // Se usuário atual for vendedor, pré-seleciona ele
        if (user && user.role === 'VENDEDOR') {
          setSelectedSellerId(user.id);
        } else if (usersData.length > 0) {
          const firstSeller = usersData.find((u: any) => u.role === 'VENDEDOR') || usersData[0];
          setSelectedSellerId(firstSeller.id);
        }
      }

      // 4. Caixa Ativo
      const cashRes = await fetch('/api/cash-register');
      if (cashRes.ok) {
        const cashData = await cashRes.json();
        setCashRegisterSummary(cashData);
        if (cashData.active) setActiveRegister(cashData.register);
        else setActiveRegister(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtragem da busca rápida
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const q = query.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q))
    );
    setSearchResults(filtered.slice(0, 8));
    setSelectedSearchIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && searchResults[selectedSearchIndex]) {
        addToCart(searchResults[selectedSearchIndex]);
      } else if (searchQuery.trim()) {
        // Tenta achar correspondência exata por código de barras
        const exactMatch = products.find(
          (p) => p.barcode === searchQuery.trim() || p.code === searchQuery.trim()
        );
        if (exactMatch) {
          addToCart(exactMatch);
        }
      }
    }
  };

  const addToCart = (product: any) => {
    if (!activeRegister) {
      alert('Não é permitido adicionar itens ou realizar vendas sem um turno de caixa aberto. Abra o caixa primeiro.');
      return;
    }

    if (cashRegisterSummary?.summary?.isFromPreviousDay) {
      alert(`O caixa atual é de um dia anterior (${cashRegisterSummary.summary.openedDateFormatted}). Por regra de segurança comercial, é obrigatório fechar este caixa antes de iniciar as vendas de hoje.`);
      return;
    }

    if (product.stockQuantity <= 0) {
      alert(`Produto "${product.name}" sem estoque disponível!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stockQuantity) {
          alert(`Estoque máximo atingido para "${product.name}" (${product.stockQuantity} ${product.unit})`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice - item.discount,
              }
            : item
        );
      }

      const newItem: CartItem = {
        id: product.id,
        code: product.code || '',
        barcode: product.barcode || '',
        name: product.name,
        unit: product.unit || 'UN',
        unitPrice: product.salePrice,
        costPrice: product.costPrice,
        quantity: 1,
        discount: 0,
        total: product.salePrice,
        commissionRate: product.commissionRate,
        stockQuantity: product.stockQuantity,
      };
      return [newItem, ...prev];
    });

    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stockQuantity) {
              alert(`Estoque máximo atingido (${item.stockQuantity} ${item.unit})`);
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice - item.discount,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const finalTotal = Math.max(0, subtotal - discountTotal);
  const change = Math.max(0, (Number(cashGiven) || 0) - finalTotal);

  const handleFinishSale = async () => {
    if (cart.length === 0) return;
    if (isSubmitting) return;

    if (paymentMethod === 'CREDIARIO' && !selectedCustomerId) {
      alert('Para vendas a prazo/crediário, selecione um cliente cadastrado!');
      return;
    }

    setIsSubmitting(true);

    try {
      const saleData = {
        cashRegisterId: activeRegister?.id || null,
        cashierId: user?.id || 'admin-id',
        sellerId: selectedSellerId || null,
        customerId: selectedCustomerId || null,
        items: cart.map((i) => ({
          productId: i.id,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          discount: i.discount,
        })),
        payments: [
          {
            method: paymentMethod,
            amount: finalTotal,
            installments: paymentMethod === 'CREDIARIO' ? installments : 1,
            changeAmount: paymentMethod === 'DINHEIRO' ? change : 0,
          },
        ],
        discount: discountTotal,
        notes,
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao gravar venda');
      }

      const completed = await res.json();
      setCompletedSale(completed);
      setShowCheckoutModal(false);
      setShowReceiptModal(true);

      // Se havia uma comanda de pré-venda importada, marca como FATURADA
      if (loadedPreSaleId) {
        try {
          await fetch('/api/pre-sales', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: loadedPreSaleId, action: 'FATURAR' }),
          });
        } catch {}
        setLoadedPreSaleId(null);
      }

      // Limpa a tela para a próxima venda
      setCart([]);
      setDiscountTotal(0);
      setCashGiven('');
      setNotes('');
      // Atualiza produtos para refletir novo estoque
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (e: any) {
      alert('Falha na venda: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col lg:flex-row gap-5">
      {/* Coluna Esquerda: Busca e Carrinho de Itens */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Barra de Busca de Produto & Comandas Mobile */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Escanear Código de Barras ou Digitar Nome do Produto... [F2]"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 text-sm shadow-inner"
              />

              {/* Dropdown de Resultados da Busca */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 max-h-80 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`flex items-center justify-between p-3 cursor-pointer border-b border-slate-100 ${
                        idx === selectedSearchIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400">
                          {item.barcode ? `EAN: ${item.barcode}` : item.code || 'Sem código'} • Estoque: {item.stockQuantity} {item.unit}
                        </p>
                      </div>
                      <span className="font-extrabold text-blue-600 text-base">
                        {formatCurrency(item.salePrice)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={loadPendingPreSales}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm flex-shrink-0"
              title="Puxar Pré-Venda ou Comanda emitida no Celular"
            >
              <Inbox className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Puxar Comanda</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMobileConnectModal(true)}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm flex-shrink-0"
              title="Acessar pelo Celular (Android / iPhone)"
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Conectar Celular</span>
            </button>
          </div>

          {/* Alerta de Caixa Fechado ou Pendente de Fechamento */}
          {cashRegisterSummary?.summary?.isFromPreviousDay ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-rose-50 border-2 border-rose-500 text-rose-900 rounded-2xl text-xs font-semibold gap-2 animate-fadeIn shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span>
                  <strong>CAIXA DO DIA ANTERIOR PENDENTE:</strong> Aberto em {cashRegisterSummary.summary.openedDateFormatted}. É obrigatório fechar este caixa antes de iniciar as vendas de hoje.
                </span>
              </div>
              <a
                href="/caixa"
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-center whitespace-nowrap shadow"
              >
                Fechar Caixa Anterior
              </a>
            </div>
          ) : !activeRegister ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-amber-50 border-2 border-amber-500 text-amber-900 rounded-2xl text-xs font-semibold gap-2 animate-fadeIn shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>CAIXA FECHADO:</strong> Não é permitido efetuar vendas sem um turno de caixa aberto.
                </span>
              </div>
              <a
                href="/caixa"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-center whitespace-nowrap shadow"
              >
                Abrir Turno de Caixa
              </a>
            </div>
          ) : null}

          {/* Banner de Comanda Carregada */}
          {loadedPreSaleId && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-indigo-100/80 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-semibold animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <span>Comanda <strong>#{loadedPreSaleId}</strong> carregada no caixa. Ao confirmar o cupom, ela será marcada como Faturada.</span>
              </div>
              <button
                type="button"
                onClick={() => setLoadedPreSaleId(null)}
                className="text-xs text-indigo-700 hover:text-indigo-950 font-bold underline ml-2"
              >
                Desvincular
              </button>
            </div>
          )}
        </div>

        {/* Tabela de Itens no Carrinho */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingBag className="w-16 h-16 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-600">Caixa Livre</p>
              <p className="text-xs text-slate-400">
                Passe o leitor de código de barras ou use a busca para adicionar produtos
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-wider px-3 pb-2 border-b">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Descrição</span>
                <span className="col-span-2 text-right">Unitário</span>
                <span className="col-span-2 text-center">Qtd</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              {cart.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm hover:border-blue-300 transition-all"
                >
                  <span className="col-span-1 font-bold text-slate-400 text-xs">
                    {cart.length - index}
                  </span>
                  <div className="col-span-5">
                    <p className="font-bold text-slate-800 text-xs leading-tight">{item.name}</p>
                    <span className="text-[10px] text-slate-400">{item.barcode || item.code}</span>
                  </div>
                  <span className="col-span-2 text-right text-xs text-slate-600 font-medium">
                    {formatCurrency(item.unitPrice)}
                  </span>
                  <div className="col-span-2 flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="font-bold text-slate-900 text-xs">
                      {formatCurrency(item.total)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remover item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé de Informação de Atalhos */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold">F2</kbd> Busca</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold">F4</kbd> Finalizar</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold">ESC</kbd> Cancelar</span>
          </div>
          <span className="font-medium text-slate-600">{cart.length} itens no carrinho</span>
        </div>
      </div>

      {/* Coluna Direita: Vendedor, Cliente, Totais e Botão de Finalização */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        {/* Painel do Vendedor & Cliente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Vendedor Responsável
            </label>
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nenhum (Venda Direta de Balcão)</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{isManagerOrAdmin && s.commissionRate ? ` (${s.commissionRate}%)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Cliente
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isRevenda ? '⭐ [REVENDA]' : ''} {c.creditLimit > 0 ? `(Limite: ${formatCurrency(c.creditLimit)})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Destaque de Benefício de Revenda */}
          {(() => {
            const currentCust = customers.find((c) => c.id === selectedCustomerId);
            if (!currentCust?.isRevenda) return null;

            if (currentCust.validity?.status === 'ATIVO') {
              return (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Revenda: {currentCust.revendaDesconto}% OFF
                    </span>
                    <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      {currentCust.validity.daysRemaining} dias restantes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const disc = (subtotal * (currentCust.revendaDesconto || 0)) / 100;
                      setDiscountTotal(Number(disc.toFixed(2)));
                    }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Aplicar Desconto Revenda ({currentCust.revendaDesconto}%)
                  </button>
                </div>
              );
            }

            if (currentCust.validity?.status === 'EXPIRADO') {
              return (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Revenda Expirado (+90 dias sem compras). Não aplicável automaticamente.</span>
                </div>
              );
            }

            if (currentCust.validity?.status === 'PENDENTE_APROVACAO') {
              return (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Revenda aguardando confirmação do Gerente ou Administrador.</span>
                </div>
              );
            }

            return null;
          })()}
        </div>

        {/* Painel de Totais */}
        <div className="flex-1 bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between border border-slate-800">
          <div className="space-y-3">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-400 text-sm">
              <span>Desconto (R$):</span>
              <input
                type="number"
                min="0"
                step="0.50"
                value={discountTotal || ''}
                placeholder="0.00"
                onChange={(e) => setDiscountTotal(Number(e.target.value) || 0)}
                className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-right font-bold text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Total a Pagar
              </span>
              <p className="text-4xl font-black text-emerald-400 mt-1">
                {formatCurrency(finalTotal)}
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-6 space-y-2.5">
            <button
              onClick={() => {
                if (!activeRegister) {
                  alert('Não é permitido finalizar vendas sem um turno de caixa aberto. Abra o caixa primeiro no menu Turno de Caixa.');
                  return;
                }
                if (cashRegisterSummary?.summary?.isFromPreviousDay) {
                  alert(`O caixa atual é de um dia anterior (${cashRegisterSummary.summary.openedDateFormatted}) e deve ser fechado obrigatoriamente antes de realizar vendas hoje.`);
                  return;
                }
                setShowCheckoutModal(true);
              }}
              disabled={cart.length === 0 || !activeRegister || cashRegisterSummary?.summary?.isFromPreviousDay}
              className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-lg transition-all ${
                cart.length > 0 && activeRegister && !cashRegisterSummary?.summary?.isFromPreviousDay
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>FINALIZAR VENDA [F4]</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {cart.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Deseja cancelar e limpar o carrinho atual?')) setCart([]);
                }}
                className="w-full py-2 text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                Limpar Carrinho [ESC]
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE FINALIZAÇÃO & PAGAMENTO */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">Finalizar Venda</h3>
                <p className="text-xs text-slate-500">Selecione a forma de pagamento e informe o valor</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Destaque do Total */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total da Venda</span>
                <p className="text-3xl font-black text-emerald-400">{formatCurrency(finalTotal)}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>{cart.length} produtos</p>
                <p>Desconto: {formatCurrency(discountTotal)}</p>
              </div>
            </div>

            {/* Seleção da Forma de Pagamento */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                { id: 'PIX', label: 'PIX Instantâneo', icon: QrCode },
                { id: 'CARTAO_DEBITO', label: 'Débito', icon: CreditCard },
                { id: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard },
                { id: 'CREDIARIO', label: 'Crediário / A Prazo', icon: Calendar },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Painel Específico da Forma Escolhida */}
            {paymentMethod === 'DINHEIRO' && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-900">Valor Recebido do Cliente:</label>
                  <input
                    type="number"
                    step="1.00"
                    placeholder={finalTotal.toFixed(2)}
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-36 px-3 py-1.5 rounded-xl border border-emerald-300 font-extrabold text-right text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800">Troco a Devolver:</span>
                  <span className="text-xl font-black text-emerald-700">{formatCurrency(change)}</span>
                </div>
              </div>
            )}

            {paymentMethod === 'PIX' && (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-center space-y-2">
                <QrCode className="w-16 h-16 mx-auto text-blue-600" />
                <p className="text-xs font-bold text-blue-900">Chave PIX da Loja Configurada</p>
                <p className="text-[11px] text-blue-600">Aguarde a confirmação do pagamento pelo cliente no celular</p>
              </div>
            )}

            {paymentMethod === 'CREDIARIO' && (
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-900">Número de Parcelas (Mensais):</label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="p-1.5 rounded-lg border border-indigo-300 font-bold text-indigo-900 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((num) => (
                      <option key={num} value={num}>
                        {num}x de {formatCurrency(finalTotal / num)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-indigo-700 font-medium">
                  Serão gerados títulos em Contas a Receber para o cliente selecionado.
                </p>
              </div>
            )}

            {/* Botão Concluir */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                onClick={handleFinishSale}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{isSubmitting ? 'Gravando...' : 'Confirmar e Imprimir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RECIBO / CUPOM IMPRESSÃO */}
      {showReceiptModal && completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between no-print">
              <h3 className="font-bold text-slate-800">Cupom Não Fiscal</h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avisos Comerciais de Revenda */}
            {completedSale.promotedToRevenda && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 no-print space-y-1">
                <p className="flex items-center gap-1.5 font-black text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  1ª Compra acima de R$ 300,00!
                </p>
                <p className="text-[11px] font-medium text-amber-800">
                  Este cliente atingiu o critério para se tornar <strong>Revenda</strong> com até 30% de desconto. Confirme os dados em <em>Clientes & Revenda</em> para aprovação!
                </p>
              </div>
            )}

            {completedSale.revendaRenewed && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold no-print flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Desconto de Revenda renovado por mais 90 dias a partir desta compra!</span>
              </div>
            )}

            {/* Área de Impressão (Estilo Cupom Térmico 80mm) */}
            <div id="print-area" className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-mono text-xs text-slate-800 space-y-2">
              <div className="text-center border-b pb-2 border-slate-300">
                <p className="font-bold text-sm">WEB-GESCOM COMERCIAL</p>
                <p className="text-[10px]">DOCUMENTO NÃO FISCAL</p>
                <p className="text-[10px]">Data: {new Date(completedSale.createdAt).toLocaleString('pt-BR')}</p>
                <p className="text-[10px] font-bold">CUPOM Nº {completedSale.id}</p>
              </div>

              <div className="border-b pb-2 border-slate-300 text-[10px] space-y-0.5">
                <p>Cliente: {completedSale.customer?.name || 'Consumidor Final'}</p>
                <p>Operador: {completedSale.cashier?.name}</p>
                {completedSale.seller && <p>Vendedor: {completedSale.seller?.name}</p>}
              </div>

              <div className="border-b pb-2 border-slate-300 space-y-1 text-[11px]">
                {completedSale.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.quantity}x {item.productName.slice(0, 18)}</span>
                    <span className="font-bold">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 font-bold">
                <div className="flex justify-between text-xs">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(completedSale.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>FORMA:</span>
                  <span>{completedSale.paymentMethod}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-slate-300 text-[10px] text-slate-500">
                <p>Obrigado pela preferência!</p>
                <p>Volte Sempre!</p>
              </div>
            </div>

            {/* Ações pós-venda */}
            <div className="flex gap-2 no-print">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Cupom</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMANDAS MOBILE (PRÉ-VENDAS PENDENTES) */}
      {showPreSalesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Comandas de Pré-Venda Mobile</h3>
                  <p className="text-xs text-slate-400">Lançadas pelos vendedores nos smartphones (Android / iOS)</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreSalesModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {pendingPreSales.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">Nenhuma comanda pendente</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Quando um vendedor finalizar uma pré-venda pelo celular, ela aparecerá aqui para ser faturada no caixa.
                  </p>
                </div>
              ) : (
                pendingPreSales.map((ps) => (
                  <div
                    key={ps.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700">
                          Comanda #{ps.id}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(ps.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {ps.notes && (
                          <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                            {ps.notes}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        Vendedor: <span className="font-bold text-slate-900">{ps.seller?.name || 'Não identificado'}</span>
                        {ps.customer && <> • Cliente: <span className="font-bold text-slate-900">{ps.customer.name}</span></>}
                      </p>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-1.5 pt-0.5">
                        {ps.items?.map((it: any, i: number) => (
                          <span key={i} className="bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-medium">
                            {it.quantity}x {it.productName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Comanda</span>
                        <span className="text-base font-black text-indigo-600">{formatCurrency(ps.total)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancelPreSale(ps.id)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                          title="Cancelar Comanda"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleImportPreSale(ps)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>Carregar no Caixa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                onClick={() => setShowPreSalesModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONEXÃO MOBILE / DISPOSITIVOS MÓVEIS */}
      {showMobileConnectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Terminal de Bolso (Celular)</h3>
                  <p className="text-xs text-slate-400">Android & iPhone / iPad</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileConnectModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-900 space-y-1">
                <p className="font-black flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Como usar no celular:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium text-emerald-800">
                  <li>Conecte o smartphone no <strong>mesmo Wi-Fi</strong> deste computador.</li>
                  <li>Abra o navegador (Chrome / Safari) no celular.</li>
                  <li>Acesse o endereço da loja com <code>/mobile</code> no final.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Link de Acesso no Navegador do Celular:
                </label>
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                  <code className="font-mono font-bold text-slate-800 text-xs select-all">
                    http://{typeof window !== 'undefined' ? window.location.hostname : 'IP-DO-PC'}:3000/mobile
                  </code>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`http://${window.location.hostname}:3000/mobile`);
                        alert('Link copiado!');
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
                    title="Copiar Link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  * Dica: No celular, o vendedor pode clicar em "Adicionar à Tela de Início" para abrir como um aplicativo nativo em tela cheia!
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowMobileConnectModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

