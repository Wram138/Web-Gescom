'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Package,
  Receipt,
  User,
  CheckCircle,
  Clock,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Lock,
  ArrowRight,
  LogOut,
  Store,
  Tag,
  Check,
  AlertCircle,
  Share2,
} from 'lucide-react';
import VersionBadge from '@/components/VersionBadge';

export default function MobileTerminalPage() {
  // Sessão local do vendedor no celular
  const [mobileUser, setMobileUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Lista de vendedores e login móvel
  const [sellersList, setSellersList] = useState<any[]>([]);
  const [selectedSellerUsername, setSelectedSellerUsername] = useState('');
  const [mobilePassword, setMobilePassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navegação inferior mobile: 'ESTOQUE' | 'COMANDA' | 'HISTORICO'
  const [activeTab, setActiveTab] = useState<'ESTOQUE' | 'COMANDA' | 'HISTORICO'>('ESTOQUE');

  // Dados do catálogo e clientes
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Carrinho da Comanda atual
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerNameManual, setCustomerNameManual] = useState<string>('');
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Comandas geradas
  const [myPreSales, setMyPreSales] = useState<any[]>([]);
  const [createdPreSale, setCreatedPreSale] = useState<any>(null);
  const [isSendingPreSale, setIsSendingPreSale] = useState(false);

  useEffect(() => {
    // Carrega sessão salva no navegador móvel
    const saved = localStorage.getItem('webgescom_mobile_seller');
    if (saved) {
      try {
        setMobileUser(JSON.parse(saved));
      } catch {
        setMobileUser(null);
      }
    }
    setIsAuthLoading(false);
    loadInitialData();
  }, []);

  useEffect(() => {
    if (mobileUser) {
      loadMyPreSales();
    }
  }, [mobileUser, activeTab]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const [resUsers, resProd, resCust] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/products'),
        fetch('/api/customers'),
      ]);

      if (resUsers.ok) {
        const uData = await resUsers.json();
        setSellersList(uData.filter((u: any) => u.active));
        if (uData.length > 0) {
          const first = uData.find((u: any) => u.role === 'VENDEDOR') || uData[0];
          setSelectedSellerUsername(first.username);
        }
      }

      if (resProd.ok) setProducts(await resProd.json());
      if (resCust.ok) setCustomers(await resCust.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadMyPreSales = async () => {
    if (!mobileUser?.id) return;
    try {
      const res = await fetch(`/api/pre-sales?sellerId=${mobileUser.id}&status=ALL`);
      if (res.ok) {
        setMyPreSales(await res.json());
      }
    } catch { }
  };

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedSellerUsername,
          password: mobilePassword,
        }),
      });

      if (res.ok) {
        const user = await res.json();
        setMobileUser(user);
        localStorage.setItem('webgescom_mobile_seller', JSON.stringify(user));
        setMobilePassword('');
      } else {
        const err = await res.json();
        setLoginError(err.error || 'Senha incorreta!');
      }
    } catch (e: any) {
      setLoginError('Erro de conexão com o servidor local: ' + e.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMobileLogout = () => {
    if (confirm('Deseja desconectar este vendedor do terminal móvel?')) {
      setMobileUser(null);
      localStorage.removeItem('webgescom_mobile_seller');
    }
  };

  // Funções do Carrinho da Comanda
  const addToCart = (product: any) => {
    if (product.stockQuantity <= 0) {
      alert(`Produto "${product.name}" sem estoque no momento!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stockQuantity) {
          alert(`Estoque máximo atingido (${product.stockQuantity} ${product.unit})`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unit: product.unit || 'UN',
          unitPrice: product.salePrice,
          quantity: 1,
          discount: 0,
          total: product.salePrice,
          stockQuantity: product.stockQuantity,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stockQuantity) {
              alert(`Limite de estoque atingido`);
              return item;
            }
            return { ...item, quantity: newQty, total: newQty * item.unitPrice };
          }
          return item;
        })
        .filter(Boolean) as any[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const finalTotal = Math.max(0, subtotal - discountTotal);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSendPreSale = async () => {
    if (cart.length === 0) return;
    setIsSendingPreSale(true);

    try {
      const payload = {
        sellerId: mobileUser.id,
        customerId: selectedCustomerId || null,
        customerName: customerNameManual || selectedCustomer?.name || 'Consumidor Balcão',
        items: cart,
        discount: discountTotal,
        notes,
      };

      const res = await fetch('/api/pre-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const preSale = await res.json();
        setCreatedPreSale(preSale);
        setCart([]);
        setDiscountTotal(0);
        setCustomerNameManual('');
        setNotes('');
        loadMyPreSales();
      } else {
        const err = await res.json();
        alert('Erro ao enviar comanda: ' + err.error);
      }
    } catch (e: any) {
      alert('Falha na comanda: ' + e.message);
    } finally {
      setIsSendingPreSale(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q))
    );
  });

  // TELA DE LOGIN MÓVEL DO VENDEDOR
  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!mobileUser) {
    return (
      <div className="h-screen w-screen bg-slate-900 p-4 flex flex-col justify-center items-center">
        <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg shadow-blue-500/30">
              <Store className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-800">Web-Gescom Mobile</h1>
            <p className="text-xs text-blue-600 font-bold">Terminal de Bolso do Vendedor</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Consulte estoque em tempo real e envie comandas direto ao caixa
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleMobileLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Selecione seu Nome</label>
              <select
                value={selectedSellerUsername}
                onChange={(e) => setSelectedSellerUsername(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-bold text-sm bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                {sellersList.map((s) => (
                  <option key={s.id} value={s.username}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Senha de Acesso / PIN</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Digite sua senha..."
                  value={mobilePassword}
                  onChange={(e) => setMobilePassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <span>{isLoggingIn ? 'Entrando...' : 'Iniciar Atendimento'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <VersionBadge variant="mobile" />
          </div>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL DO APLICATIVO MOBILE
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* Top Header Mobile */}
      <header className="h-14 bg-slate-900 text-white px-4 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
            {mobileUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold truncate max-w-[150px]">{mobileUser.name}</p>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Conectado
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VersionBadge variant="header" className="bg-slate-800 border-slate-700 text-slate-300 text-[10px] py-0.5 px-2" />
          <button
            onClick={handleMobileLogout}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg text-xs"
            title="Desconectar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Conteúdo Dinâmico por Aba */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* ABA 1: CONSULTA DE ESTOQUE & PREÇO */}
        {activeTab === 'ESTOQUE' && (
          <div className="space-y-3 pb-20">
            {/* Barra de Busca Móvel */}
            <div className="sticky top-0 bg-slate-100 pt-1 pb-2 z-10">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar produto ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Lista de Produtos */}
            <div className="space-y-2">
              {filteredProducts.map((p) => {
                const inStock = p.stockQuantity > 0;
                const inCartItem = cart.find((i) => i.productId === p.id);

                return (
                  <div
                    key={p.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 active:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-slate-900 leading-tight truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {p.barcode || p.code || 'Sem cód.'}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                            inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inStock ? `${p.stockQuantity} ${p.unit} em estoque` : 'Esgotado'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="font-black text-sm text-slate-900">
                        {formatCurrency(p.salePrice)}
                      </span>

                      {inStock && (
                        <button
                          onClick={() => addToCart(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 active:scale-95 transition-all ${
                            inCartItem
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white hover:bg-blue-500'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{inCartItem ? `${inCartItem.quantity}x` : 'Comanda'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 2: NOVA COMANDA (CARRINHO MÓVEL) */}
        {activeTab === 'COMANDA' && (
          <div className="space-y-4 pb-24">
            {/* Seletor de Cliente */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Cliente da Comanda
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50"
              >
                <option value="">Consumidor Balcão</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isRevenda ? '⭐ [REVENDA]' : ''}
                  </option>
                ))}
              </select>

              {!selectedCustomerId && (
                <input
                  type="text"
                  placeholder="Nome do cliente (opcional)..."
                  value={customerNameManual}
                  onChange={(e) => setCustomerNameManual(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              )}

              {/* Benefício de Revenda Ativo */}
              {selectedCustomer?.isRevenda && selectedCustomer.validity?.status === 'ATIVO' && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Revenda ({selectedCustomer.revendaDesconto}% OFF)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const disc = (subtotal * (selectedCustomer.revendaDesconto || 0)) / 100;
                      setDiscountTotal(Number(disc.toFixed(2)));
                    }}
                    className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-1 rounded-lg"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            {/* Itens da Comanda */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-800">Itens Selecionados</span>
                <span className="text-xs text-slate-400 font-semibold">{cart.length} produto(s)</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Nenhum produto adicionado à comanda</p>
                  <button
                    onClick={() => setActiveTab('ESTOQUE')}
                    className="text-xs font-bold text-blue-600 underline"
                  >
                    Consultar Estoque e Adicionar
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 divide-y divide-slate-100">
                  {cart.map((item) => (
                    <div key={item.productId} className="pt-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatCurrency(item.unitPrice)} un.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-700 shadow-sm"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-700 shadow-sm"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-extrabold text-xs text-slate-900 w-16 text-right">
                          {formatCurrency(item.total)}
                        </span>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totais & Envio */}
            {cart.length > 0 && (
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl space-y-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-black text-emerald-400">{formatCurrency(finalTotal)}</span>
                </div>

                <button
                  onClick={handleSendPreSale}
                  disabled={isSendingPreSale}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSendingPreSale ? 'Enviando ao Caixa...' : 'ENVIAR PARA O CAIXA'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: MINHAS COMANDAS */}
        {activeTab === 'HISTORICO' && (
          <div className="space-y-3 pb-20">
            <h3 className="font-bold text-xs text-slate-600 uppercase tracking-wider">
              Minhas Comandas Geradas Hoje
            </h3>

            {myPreSales.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border text-center text-slate-400 space-y-2">
                <Receipt className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">Nenhuma comanda lançada ainda hoje.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myPreSales.map((ps) => {
                  const isPending = ps.status === 'PENDENTE';

                  return (
                    <div
                      key={ps.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-800">
                            Comanda #{ps.id}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isPending ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            {isPending ? 'Aguardando no Caixa' : 'Faturada'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ps.customerName || ps.customer?.name || 'Consumidor'} • {ps.items?.length || 0} itens
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-slate-900">
                          {formatCurrency(ps.total)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {new Date(ps.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE SUCESSO DA COMANDA ENVIADA */}
      {createdPreSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Comanda Enviada com Sucesso!
              </span>
              <p className="text-4xl font-black text-slate-900 mt-1">
                #{createdPreSale.id}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Informe o número <strong>#{createdPreSale.id}</strong> ao cliente ou ao operador de caixa para pagamento.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between font-bold text-slate-800">
              <span>Valor Total:</span>
              <span className="text-emerald-600 font-black">{formatCurrency(createdPreSale.total)}</span>
            </div>

            <button
              onClick={() => {
                setCreatedPreSale(null);
                setActiveTab('ESTOQUE');
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md"
            >
              Novo Atendimento
            </button>
          </div>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO INFERIOR MOBILE (BOTTOM TAB BAR) */}
      <nav className="h-16 bg-white border-t border-slate-200 px-4 flex items-center justify-around flex-shrink-0 z-20 shadow-lg">
        <button
          onClick={() => setActiveTab('ESTOQUE')}
          className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
            activeTab === 'ESTOQUE' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[11px]">Estoque</span>
        </button>

        <button
          onClick={() => setActiveTab('COMANDA')}
          className={`relative flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
            activeTab === 'COMANDA' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </div>
          <span className="text-[11px]">Comanda</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORICO')}
          className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
            activeTab === 'HISTORICO' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[11px]">Comandas</span>
        </button>
      </nav>
    </div>
  );
}

