'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
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
  Truck,
  ShoppingCart,
  Percent,
  Check,
  Building,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { validateCPF, validateCNPJ, validateCEP, fetchAddressByCEP, formatPhone } from '@/lib/validators';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function PessoasPage() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('TODOS');

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedForApproval, setSelectedForApproval] = useState<any>(null);
  const [approvalDiscount, setApprovalDiscount] = useState<number>(20);

  // Form de Cadastro / Edição
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    hasWhatsapp: true,
    isClient: true,
    isRevenda: false,
    isSupplier: false,
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

  const [docValidation, setDocValidation] = useState<{ valid: boolean; formatted?: string; error?: string } | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string>('');

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setPeople(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingPerson(null);
    setFormData({
      name: '',
      phone: '',
      hasWhatsapp: true,
      isClient: true,
      isRevenda: false,
      isSupplier: false,
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
    setDocValidation(null);
    setCepFeedback('');
    setShowModal(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingPerson(p);
    setFormData({
      name: p.name || '',
      phone: p.phone || '',
      hasWhatsapp: Boolean(p.hasWhatsapp),
      isClient: p.isClient !== undefined ? Boolean(p.isClient) : true,
      isRevenda: Boolean(p.isRevenda),
      isSupplier: Boolean(p.isSupplier),
      cpfCnpj: p.cpfCnpj || '',
      cep: p.cep || '',
      street: p.street || '',
      number: p.number || '',
      complement: p.complement || '',
      neighborhood: p.neighborhood || '',
      city: p.city || '',
      state: p.state || 'SP',
      email: p.email || '',
      creditLimit: p.creditLimit || 0,
      notes: p.notes || '',
      revendaDesconto: p.revendaDesconto || 15,
    });

    if (p.cpfCnpj) {
      handleDocChange(p.cpfCnpj);
    } else {
      setDocValidation(null);
    }
    setCepFeedback('');
    setShowModal(true);
  };

  // Validação dinâmica inteligente (CPF ou CNPJ)
  const handleDocChange = (val: string) => {
    setFormData((prev) => ({ ...prev, cpfCnpj: val }));
    const clean = val.replace(/\D/g, '');

    if (clean.length === 11) {
      const res = validateCPF(clean);
      setDocValidation({ valid: res.valid, formatted: res.formatted, error: res.error });
    } else if (clean.length === 14) {
      const res = validateCNPJ(clean);
      setDocValidation({ valid: res.valid, formatted: res.formatted, error: res.error });
    } else if (clean.length > 0) {
      setDocValidation({ valid: false, error: 'Documento incompleto (11 para CPF ou 14 para CNPJ)' });
    } else {
      setDocValidation(null);
    }
  };

  // Busca e validação automática de CEP
  const handleCepChange = async (val: string) => {
    setFormData((prev) => ({ ...prev, cep: val }));
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
          state: res.data!.state.toUpperCase(),
        }));
        setCepFeedback('Endereço preenchido com sucesso!');
      } else {
        setCepFeedback(res.error || 'CEP não localizado');
      }
    } else {
      setCepFeedback('');
    }
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.isClient && !formData.isRevenda && !formData.isSupplier) {
      alert('Selecione ao menos um perfil para esta pessoa: Cliente, Revenda ou Fornecedor.');
      return;
    }

    // Validações no cliente
    if (formData.isRevenda) {
      if (!formData.cpfCnpj || !docValidation?.valid) {
        alert('Documento (CPF ou CNPJ) válido é obrigatório para perfil de Revenda!');
        return;
      }
      const cepCheck = validateCEP(formData.cep);
      if (!cepCheck.valid) {
        alert('CEP Inválido: ' + cepCheck.error);
        return;
      }
      if (!formData.street || !formData.number || !formData.neighborhood || !formData.city || !formData.state) {
        alert('Todos os campos de endereço são obrigatórios para cadastro de Revenda!');
        return;
      }
    } else if (formData.cpfCnpj && docValidation && !docValidation.valid) {
      alert('Documento incorreto: ' + (docValidation.error || 'Dígito verificador inválido.'));
      return;
    }

    try {
      const method = editingPerson ? 'PUT' : 'POST';
      const payload = {
        ...(editingPerson ? { id: editingPerson.id } : {}),
        ...formData,
        cpfCnpj: docValidation?.formatted || formData.cpfCnpj,
        approvedBy: isManagerOrAdmin ? user?.name : undefined,
      };

      const res = await fetch('/api/customers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        loadPeople();
      } else {
        const err = await res.json();
        alert('Erro ao salvar pessoa: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpenApproveModal = (person: any) => {
    setSelectedForApproval(person);
    setApprovalDiscount(person.revendaDesconto > 0 ? person.revendaDesconto : 20);
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
        loadPeople();
        alert(`Revenda aprovada com ${approvalDiscount}% de desconto por 90 dias!`);
      } else {
        const err = await res.json();
        alert('Erro ao aprovar revenda: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Filtragem da Lista
  const filteredPeople = people.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search) ||
      p.cpfCnpj?.includes(search);

    if (!matchSearch) return false;

    if (filterType === 'CLIENTES') return p.isClient && !p.isRevenda;
    if (filterType === 'REVENDAS') return p.isRevenda;
    if (filterType === 'FORNECEDORES') return p.isSupplier;
    if (filterType === 'PENDENTE_REVENDA') return p.isRevenda && p.revendaStatus === 'PENDENTE_APROVACAO';

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Gestão de Pessoas</h1>
            <p className="text-xs text-slate-400">
              Clientes, Revendas e Fornecedores integrados ao PDV, Contas a Pagar e Receber
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Pessoa</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, documento ou telefone..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterType('TODOS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'TODOS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({people.length})
          </button>
          <button
            onClick={() => setFilterType('CLIENTES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'CLIENTES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Clientes ({people.filter((p) => p.isClient).length})
          </button>
          <button
            onClick={() => setFilterType('REVENDAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'REVENDAS'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Revendas ({people.filter((p) => p.isRevenda).length})
          </button>
          <button
            onClick={() => setFilterType('FORNECEDORES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'FORNECEDORES'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Fornecedores ({people.filter((p) => p.isSupplier).length})
          </button>
          {people.some((p) => p.isRevenda && p.revendaStatus === 'PENDENTE_APROVACAO') && (
            <button
              onClick={() => setFilterType('PENDENTE_REVENDA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer animate-pulse ${
                filterType === 'PENDENTE_REVENDA'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
              }`}
            >
              Aguardando Aprovação ({people.filter((p) => p.isRevenda && p.revendaStatus === 'PENDENTE_APROVACAO').length})
            </button>
          )}
        </div>
      </div>

      {/* Lista de Pessoas */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">Nenhuma pessoa encontrada</h3>
          <p className="text-xs text-slate-400">Tente ajustar seus termos de busca ou filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeople.map((p) => {
            const hasCpf = Boolean(p.cpfCnpj);
            const isAddressComplete = Boolean(p.cep && p.street && p.number);

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{p.name}</h3>
                      <p className="text-[11px] font-mono font-medium text-slate-400 mt-0.5">
                        {p.cpfCnpj || 'Documento não informado'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar Cadastro"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges de Atuação / Perfis */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.isClient && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        <span>Cliente</span>
                      </span>
                    )}

                    {p.isSupplier && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        <span>Fornecedor</span>
                      </span>
                    )}

                    {p.isRevenda && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          p.revendaStatus === 'ATIVO'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : p.revendaStatus === 'PENDENTE_APROVACAO'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 font-black animate-pulse'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Revenda ({p.revendaDesconto}% OFF)</span>
                      </span>
                    )}
                  </div>

                  {/* Contato & Localização */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">{p.phone}</span>
                      {p.hasWhatsapp && (
                        <a
                          href={`https://wa.me/55${p.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1"
                          title="Chamar no WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {p.city && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {p.city}/{p.state || 'SP'} {p.neighborhood ? `• ${p.neighborhood}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé / Ações Financeiras */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3">
                    {p.pendingReceivablesCount > 0 && (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3 text-amber-600" />
                        <span>{p.pendingReceivablesCount} a receber</span>
                      </span>
                    )}

                    {p.isSupplier && p.pendingPayablesCount > 0 && (
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                        <ArrowDownCircle className="w-3 h-3 text-rose-600" />
                        <span>{p.pendingPayablesCount} a pagar</span>
                      </span>
                    )}
                  </div>

                  {p.isRevenda && p.revendaStatus === 'PENDENTE_APROVACAO' && isManagerOrAdmin && (
                    <button
                      onClick={() => handleOpenApproveModal(p)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-[10px] flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Award className="w-3 h-3" />
                      <span>Aprovar Desconto</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          MODAL DE CADASTRO / EDIÇÃO DE PESSOA
         ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">
                    {editingPerson ? 'Editar Pessoa' : 'Cadastrar Nova Pessoa'}
                  </h2>
                  <p className="text-xs text-slate-400">Defina os perfis de atuação e informações de contato</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="space-y-6">
              {/* Seleção de Perfis (Pode ser múltiplos) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Perfis de Atuação da Pessoa *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Perfil: Cliente */}
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formData.isClient
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isClient}
                      onChange={(e) => setFormData({ ...formData, isClient: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs block">🛒 Cliente</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Habilitado no PDV</span>
                    </div>
                  </label>

                  {/* Perfil: Fornecedor */}
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formData.isSupplier
                        ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isSupplier}
                      onChange={(e) => setFormData({ ...formData, isSupplier: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs block">🏭 Fornecedor</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Contas a Pagar</span>
                    </div>
                  </label>

                  {/* Perfil: Revenda */}
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formData.isRevenda
                        ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isRevenda}
                      onChange={(e) => setFormData({ ...formData, isRevenda: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs block">⭐ Revenda</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Desconto até 30%</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Dados Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome Completo / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João da Silva ou Fornecedora Distribuidora LTDA"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* CPF ou CNPJ */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      CPF ou CNPJ {formData.isRevenda && '*'}
                    </label>
                    {docValidation?.valid ? (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>VÁLIDO</span>
                      </span>
                    ) : docValidation?.error ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {docValidation.error}
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleDocChange(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className={`w-full p-2.5 rounded-xl border text-sm font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
                      docValidation?.valid
                        ? 'border-emerald-400 focus:ring-emerald-500'
                        : docValidation?.error
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-blue-500'
                    }`}
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone de Contato *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="flex items-center gap-1 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-100">
                      <input
                        type="checkbox"
                        checked={formData.hasWhatsapp}
                        onChange={(e) => setFormData({ ...formData, hasWhatsapp: e.target.checked })}
                        className="w-3.5 h-3.5 text-emerald-600 rounded"
                      />
                      <span>Zap</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com.br"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Limite de Crédito (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Endereço Completo */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Endereço {formData.isRevenda && '(Obrigatório para Revenda)'}
                  </span>
                  {cepFeedback && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {cepFeedback}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">CEP</label>
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Logradouro</label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Rua, Av..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Número</label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="123"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Complemento</label>
                    <input
                      type="text"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Apto, Sala..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Bairro</label>
                    <input
                      type="text"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="Bairro"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Cidade"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Estado (UF)</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ESTADOS_BRASIL.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Se for Revenda: Desconto Sugerido */}
              {formData.isRevenda && (
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                  <span className="text-xs font-black text-purple-900 block flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-purple-600" />
                    Percentual de Desconto de Revenda Sugerido (Máx 30%)
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.revendaDesconto}
                    onChange={(e) => setFormData({ ...formData, revendaDesconto: Number(e.target.value) })}
                    className="w-32 p-2 rounded-xl border border-purple-300 text-sm font-bold bg-white text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[11px] text-purple-700">
                    O desconto precisa ser aprovado por Gerente ou Administrador para entrar em vigor e vale por 90 dias a partir de cada compra.
                  </p>
                </div>
              )}

              {/* Botões do Formulário */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  {editingPerson ? 'Salvar Alterações' : 'Concluir Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE APROVAÇÃO DE REVENDA (GERENTE / ADMIN)
         ======================================================== */}
      {showApproveModal && selectedForApproval && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Aprovar Benefício de Revenda</h3>
                <p className="text-xs text-slate-400">{selectedForApproval.name}</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2 text-xs text-purple-900">
              <p className="font-semibold">
                Defina a porcentagem de desconto concedida nas vendas de balcão/PDV para este parceiro.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <label className="font-bold text-purple-950">Desconto (%):</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={approvalDiscount}
                  onChange={(e) => setApprovalDiscount(Number(e.target.value))}
                  className="w-24 p-2 rounded-xl border border-purple-300 text-sm font-bold bg-white text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                />
              </div>
              <p className="text-[10px] text-purple-700 pt-1">
                A validade inicial será fixada em 90 dias e será renovada automaticamente a cada nova compra.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer"
              >
                Confirmar e Liberar Revenda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

