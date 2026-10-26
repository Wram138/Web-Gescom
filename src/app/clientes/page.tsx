'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  ShieldCheck,
  Award,
  Edit2,
  X,
  Sparkles,
} from 'lucide-react';
import { validateCPF, validateCEP, fetchAddressByCEP, formatPhone } from '@/lib/validators';

export default function ClientesPage() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('TODOS');

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedForApproval, setSelectedForApproval] = useState<any>(null);
  const [approvalDiscount, setApprovalDiscount] = useState<number>(20);

  // Form de Cadastro
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    hasWhatsapp: true,
    isRevenda: false,
    cpfCnpj: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    email: '',
    creditLimit: 0,
    notes: '',
    revendaDesconto: 15,
  });

  const [cpfValidation, setCpfValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string>('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        setCustomers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      hasWhatsapp: true,
      isRevenda: false,
      cpfCnpj: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: 'SP',
      email: '',
      creditLimit: 0,
      notes: '',
      revendaDesconto: 15,
    });
    setCpfValidation(null);
    setCepFeedback('');
    setShowModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      phone: c.phone || '',
      hasWhatsapp: Boolean(c.hasWhatsapp),
      isRevenda: Boolean(c.isRevenda),
      cpfCnpj: c.cpfCnpj || '',
      cep: c.cep || '',
      street: c.street || '',
      number: c.number || '',
      complement: c.complement || '',
      neighborhood: c.neighborhood || '',
      city: c.city || '',
      state: c.state || 'SP',
      email: c.email || '',
      creditLimit: c.creditLimit || 0,
      notes: c.notes || '',
      revendaDesconto: c.revendaDesconto || 15,
    });
    if (c.cpfCnpj) {
      setCpfValidation(validateCPF(c.cpfCnpj));
    } else {
      setCpfValidation(null);
    }
    setCepFeedback('');
    setShowModal(true);
  };

  // Validação dinâmica de CPF
  const handleCpfChange = (val: string) => {
    setFormData({ ...formData, cpfCnpj: val });
    if (val.replace(/\D/g, '').length >= 11) {
      setCpfValidation(validateCPF(val));
    } else {
      setCpfValidation(null);
    }
  };

  // Busca e validação automática de CEP
  const handleCepChange = async (val: string) => {
    setFormData({ ...formData, cep: val });
    const clean = val.replace(/\D/g, '');
    if (clean.length === 8) {
      setIsSearchingCep(true);
      setCepFeedback('Consultando CEP nos Correios...');
      const res = await fetchAddressByCEP(clean);
      setIsSearchingCep(false);
      if (res.success && res.data) {
        setFormData((prev) => ({
          ...prev,
          street: res.data!.street,
          neighborhood: res.data!.neighborhood,
          city: res.data!.city,
          state: res.data!.state,
        }));
        setCepFeedback('Endereço preenchido com sucesso!');
      } else {
        setCepFeedback(res.error || 'CEP não localizado');
      }
    } else {
      setCepFeedback('');
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações no cliente
    if (formData.isRevenda) {
      const cpfCheck = validateCPF(formData.cpfCnpj);
      if (!cpfCheck.valid) {
        alert('CPF Inválido: ' + cpfCheck.error);
        return;
      }
      const cepCheck = validateCEP(formData.cep);
      if (!cepCheck.valid) {
        alert('CEP Inválido: ' + cepCheck.error);
        return;
      }
      if (!formData.street || !formData.number || !formData.neighborhood || !formData.city || !formData.state) {
        alert('Todos os campos de endereço são obrigatórios para clientes Revenda!');
        return;
      }
    }

    try {
      const method = editingCustomer ? 'PUT' : 'POST';
      const payload = {
        ...(editingCustomer ? { id: editingCustomer.id } : {}),
        ...formData,
        approvedBy: isManagerOrAdmin ? user?.name : undefined,
      };

      const res = await fetch('/api/customers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        loadCustomers();
      } else {
        const err = await res.json();
        alert('Erro ao salvar cliente: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpenApproveModal = (customer: any) => {
    setSelectedForApproval(customer);
    setApprovalDiscount(customer.revendaDesconto > 0 ? customer.revendaDesconto : 20);
    setShowApproveModal(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedForApproval) return;
    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedForApproval.id,
          action: 'APPROVE_REVENDA',
          discount: approvalDiscount,
          approvedBy: user?.name || 'Administrador',
        }),
      });

      if (res.ok) {
        setShowApproveModal(false);
        loadCustomers();
        alert(`Revenda aprovada com ${approvalDiscount}% de desconto por 90 dias!`);
      } else {
        const err = await res.json();
        alert('Erro ao aprovar revenda: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.cpfCnpj && c.cpfCnpj.includes(q));

    if (!matchSearch) return false;

    if (filterType === 'REVENDA_ATIVO') return c.isRevenda && c.validity?.status === 'ATIVO';
    if (filterType === 'REVENDA_PENDENTE') return c.isRevenda && c.validity?.status === 'PENDENTE_APROVACAO';
    if (filterType === 'REVENDA_EXPIRADO') return c.isRevenda && c.validity?.status === 'EXPIRADO';
    if (filterType === 'SIMPLES') return !c.isRevenda;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Clientes & Revenda</h1>
          <p className="text-sm text-slate-500">
            Cadastre clientes simples, gerencie revendedores com descontos de até 30% e validade de 90 dias
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Regras de Revenda em Destaque */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-indigo-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">Programa de Revenda Comercial</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            • Clientes Simples tornam-se revenda se a <strong>1ª compra for acima de R$ 300,00</strong>.<br />
            • Desconto de revenda de <strong>até 30%</strong>, confirmado pelo Gerente ou Administrador.<br />
            • <strong>Validade contínua de 90 dias</strong>: renova por mais 90 dias a cada compra realizada!
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl text-center border border-white/10">
          <span className="text-[11px] uppercase font-bold text-amber-300">Total Revendas Ativas</span>
          <p className="text-2xl font-black text-white">
            {customers.filter((c) => c.isRevenda && c.validity?.status === 'ATIVO').length}
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'REVENDA_ATIVO', label: '⭐ Revenda Ativo' },
            { id: 'REVENDA_PENDENTE', label: '⏳ Pendente Aprovação' },
            { id: 'REVENDA_EXPIRADO', label: '⚠️ Revenda Expirado' },
            { id: 'SIMPLES', label: 'Clientes Comuns' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Nome do Cliente</th>
                <th className="py-3.5 px-4">Telefone / WhatsApp</th>
                <th className="py-3.5 px-4">CPF / Endereço</th>
                <th className="py-3.5 px-4 text-center">Tipo de Cliente</th>
                <th className="py-3.5 px-4 text-center">Benefício Revenda</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Carregando clientes...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const val = c.validity;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{c.name}</span>
                          {c.isRevenda && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                              REVENDA
                            </span>
                          )}
                        </div>
                        {c.notes && <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.notes}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{c.phone || '—'}</span>
                          {c.hasWhatsapp && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1 py-0.2 rounded flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5" /> Whats
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <p className="font-mono text-slate-800 font-medium">{c.cpfCnpj || '—'}</p>
                        {c.city && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-xs">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {c.city}/{c.state} {c.neighborhood ? `• ${c.neighborhood}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!c.isRevenda ? (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                            Cliente Comum
                          </span>
                        ) : val?.status === 'ATIVO' ? (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-extrabold border border-emerald-300 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Revenda Ativo
                          </span>
                        ) : val?.status === 'PENDENTE_APROVACAO' ? (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold border border-amber-300 flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Aguardando Aprovação
                          </span>
                        ) : (
                          <span className="text-xs bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full font-bold border border-rose-300 flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Expirado (+90 dias)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.isRevenda ? (
                          <div>
                            <span className="text-xs font-black text-indigo-700">
                              {c.revendaDesconto}% de Desconto
                            </span>
                            {val?.status === 'ATIVO' && (
                              <p className="text-[10px] text-emerald-700 font-bold">
                                {val.daysRemaining} dias restantes
                              </p>
                            )}
                            {val?.status === 'EXPIRADO' && (
                              <p className="text-[10px] text-rose-600 font-semibold">Sem compras em 90 dias</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sem desconto</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {isManagerOrAdmin && c.isRevenda && val?.status !== 'ATIVO' && (
                          <button
                            onClick={() => handleOpenApproveModal(c)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                            title="Aprovar Desconto de Revenda por 90 dias"
                          >
                            Aprovar Revenda
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Cadastro"
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

      {/* MODAL DE CADASTRO / EDIÇÃO DE CLIENTE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <p className="text-xs text-slate-500">
                  {formData.isRevenda
                    ? 'Cliente Revenda: preenchimento de endereço e CPF obrigatórios'
                    : 'Cliente Comum: preenchimento de Nome e Telefone obrigatórios'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador de Tipo de Cliente */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-slate-800 block">Classificar como Cliente Revenda?</span>
                <span className="text-xs text-slate-500">
                  Habilita descontos de até 30% com validade de 90 dias renováveis por compra.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRevenda}
                  onChange={(e) => setFormData({ ...formData, isRevenda: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-sm">
              {/* Dados Básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telefone / Celular *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasWhatsapp}
                      onChange={(e) => setFormData({ ...formData, hasWhatsapp: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      Número possui WhatsApp
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CPF {formData.isRevenda ? '*' : '(Opcional)'}
                  </label>
                  <input
                    type="text"
                    required={formData.isRevenda}
                    placeholder="000.000.000-00"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:ring-2 ${
                      cpfValidation
                        ? cpfValidation.valid
                          ? 'border-emerald-500 bg-emerald-50/30'
                          : 'border-rose-500 bg-rose-50/30 text-rose-800'
                        : 'border-slate-300'
                    }`}
                  />
                  {cpfValidation && !cpfValidation.valid && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1">{cpfValidation.error}</p>
                  )}
                  {cpfValidation && cpfValidation.valid && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ CPF Válido</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Seção de Endereço (Obrigatória se Revenda) */}
              <div className="pt-2 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Endereço {formData.isRevenda && '(Obrigatório para Revenda)'}</span>
                  </h4>
                  {cepFeedback && (
                    <span className="text-[11px] font-bold text-blue-600">{cepFeedback}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      CEP {formData.isRevenda && '*'}
                    </label>
                    <input
                      type="text"
                      required={formData.isRevenda}
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Rua / Logradouro {formData.isRevenda && '*'}
                    </label>
                    <input
                      type="text"
                      required={formData.isRevenda}
                      placeholder="Ex: Av. Central"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Número {formData.isRevenda && '*'}
                    </label>
                    <input
                      type="text"
                      required={formData.isRevenda}
                      placeholder="Ex: 123"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto, Sala, Bloco"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Bairro {formData.isRevenda && '*'}
                    </label>
                    <input
                      type="text"
                      required={formData.isRevenda}
                      placeholder="Centro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Cidade {formData.isRevenda && '*'}
                    </label>
                    <input
                      type="text"
                      required={formData.isRevenda}
                      placeholder="São Paulo"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      UF {formData.isRevenda && '*'}
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      required={formData.isRevenda}
                      placeholder="SP"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 uppercase font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Revenda & Desconto (se marcado como revenda) */}
              {formData.isRevenda && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold text-indigo-900 uppercase">
                      Desconto de Revenda (Até 30%)
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-36">
                      <label className="block text-[11px] font-bold text-indigo-800 mb-1">% de Desconto:</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="1"
                        value={formData.revendaDesconto}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            revendaDesconto: Math.min(30, Math.max(1, Number(e.target.value))),
                          })
                        }
                        className="w-full p-2 rounded-xl border border-indigo-300 font-black text-indigo-950 bg-white"
                      />
                    </div>
                    <div className="flex-1 text-xs text-indigo-800">
                      {isManagerOrAdmin ? (
                        <p className="font-semibold text-emerald-700">
                          ✓ Como {user?.role}, você pode aprovar este desconto imediatamente com validade de 90 dias.
                        </p>
                      ) : (
                        <p className="text-amber-800 font-semibold">
                          ⏳ O cadastro será gravado como <strong>Pendente de Aprovação</strong> pelo Gerente ou Administrador.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE APROVAÇÃO DE REVENDA PELO GERENTE/ADMIN */}
      {showApproveModal && selectedForApproval && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="font-bold text-base text-slate-900">Aprovação de Revenda</h3>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><strong>Cliente:</strong> {selectedForApproval.name}</p>
              <p><strong>CPF:</strong> {selectedForApproval.cpfCnpj || 'Não informado'}</p>
              <p><strong>Telefone:</strong> {selectedForApproval.phone}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Definir Percentual de Desconto de Revenda (Limite máximo: 30%):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={approvalDiscount}
                  onChange={(e) => setApprovalDiscount(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="font-black text-xl text-indigo-700 w-16 text-right">
                  {approvalDiscount}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                O desconto ficará <strong>ativo por 90 dias</strong> a partir de hoje. Cada compra realizada no PDV renovará automaticamente a validade por mais 90 dias.
              </p>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 py-2.5 border rounded-xl font-bold text-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApproval}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white shadow text-xs"
              >
                Confirmar e Ativar (90 dias)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

