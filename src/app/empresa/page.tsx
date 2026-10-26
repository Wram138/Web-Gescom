'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Lock,
  Phone,
  Mail,
  MapPin,
  Search,
  FileText,
  Hash,
  Check,
} from 'lucide-react';
import { validateCNPJ, validateCEP, fetchAddressByCEP } from '@/lib/validators';

const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

export default function EmpresaLicencaPage() {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [licenseData, setLicenseData] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states - Emitente & Fiscais
  const [razaoSocial, setRazaoSocial] = useState('');
  const [storeName, setStoreName] = useState(''); // Nome Fantasia
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjValid, setCnpjValid] = useState(false);

  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Endereço Completo
  const [cep, setCep] = useState('');
  const [cepError, setCepError] = useState<string | null>(null);
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');

  // Cupom
  const [receiptFooter, setReceiptFooter] = useState('Obrigado pela preferência! Volte sempre.');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Carrega dados do Emitente (banco local)
      const resCompany = await fetch('/api/company');
      if (resCompany.ok) {
        const company = await resCompany.json();
        setRazaoSocial(company.razaoSocial || '');
        setStoreName(company.storeName || '');
        setCnpj(company.cnpj || '');
        if (company.cnpj) {
          const val = validateCNPJ(company.cnpj);
          setCnpjValid(val.valid);
          setCnpjError(val.error || null);
        }
        setInscricaoEstadual(company.inscricaoEstadual || '');
        setInscricaoMunicipal(company.inscricaoMunicipal || '');
        setPhone(company.phone || '');
        setEmail(company.email || '');
        setCep(company.cep || '');
        setLogradouro(company.logradouro || '');
        setNumero(company.numero || '');
        setComplemento(company.complemento || '');
        setBairro(company.bairro || '');
        setCidade(company.cidade || '');
        setUf(company.uf || 'SP');
        setReceiptFooter(company.receiptFooter || 'Obrigado pela preferência! Volte sempre.');
      }

      // Carrega dados da Licença VPS
      const resLic = await fetch('/api/license');
      if (resLic.ok) {
        const lic = await resLic.json();
        setLicenseData(lic);
      }
    } catch (e: any) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  };

  // Formatação e Validação em tempo real do CNPJ
  const handleCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    let formatted = raw;

    if (raw.length <= 2) {
      formatted = raw;
    } else if (raw.length <= 5) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2)}`;
    } else if (raw.length <= 8) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    } else if (raw.length <= 12) {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    } else {
      formatted = `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
    }

    setCnpj(formatted);

    if (raw.length === 14) {
      const result = validateCNPJ(raw);
      setCnpjValid(result.valid);
      setCnpjError(result.valid ? null : result.error || 'CNPJ inválido');
    } else if (raw.length > 0) {
      setCnpjValid(false);
      setCnpjError('CNPJ incompleto (14 dígitos)');
    } else {
      setCnpjValid(false);
      setCnpjError(null);
    }
  };

  // Formatação e Busca automática de CEP
  const handleCepChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    const formatted = clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
    setCep(formatted);
    setCepError(null);

    // Se digitou os 8 números, dispara a busca no ViaCEP automaticamente
    if (clean.length === 8) {
      await searchCep(clean);
    }
  };

  const searchCep = async (cleanCep?: string) => {
    const target = cleanCep || cep.replace(/\D/g, '');
    if (target.length !== 8) {
      setCepError('Digite os 8 números do CEP para consultar');
      return;
    }

    setIsSearchingCep(true);
    setCepError(null);
    try {
      const res = await fetchAddressByCEP(target);
      if (res.success && res.data) {
        setLogradouro(res.data.street || logradouro);
        setBairro(res.data.neighborhood || bairro);
        setCidade(res.data.city || cidade);
        if (res.data.state) setUf(res.data.state.toUpperCase());
        setFeedback({
          type: 'success',
          message: 'Endereço preenchido automaticamente via CEP!',
        });
      } else {
        setCepError(res.error || 'CEP não encontrado');
      }
    } catch {
      setCepError('Erro de conexão ao buscar CEP');
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Sincronizar Licença com a VPS
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/license', { method: 'POST' });
      const data = await res.json();
      setLicenseData(data);
      if (data.isBlocked) {
        setFeedback({
          type: 'error',
          message: data.reason || 'A licença permanece suspensa no servidor VPS.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Licença sincronizada com sucesso com o servidor VPS!',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: 'Falha ao contatar a VPS: ' + e.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Salvar Emitente Completo
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação local do CNPJ antes de enviar
    const cnpjCheck = validateCNPJ(cnpj);
    if (!cnpjCheck.valid) {
      setCnpjValid(false);
      setCnpjError(cnpjCheck.error || 'CNPJ inválido');
      setFeedback({
        type: 'error',
        message: 'Corrija o CNPJ do Emitente: ' + (cnpjCheck.error || 'Dígito verificador incorreto.'),
      });
      return;
    }

    if (!inscricaoEstadual.trim()) {
      setFeedback({
        type: 'error',
        message: 'A Inscrição Estadual é obrigatória (informe o número ou marque ISENTO).',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razaoSocial,
          storeName,
          cnpj: cnpjCheck.formatted,
          inscricaoEstadual,
          inscricaoMunicipal,
          phone,
          email,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          receiptFooter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar dados do emitente.');
      }

      setFeedback({
        type: 'success',
        message: 'Cadastro do Emitente salvo com sucesso e licença sincronizada!',
      });

      // Recarrega o status da licença
      const resLic = await fetch('/api/license');
      if (resLic.ok) {
        setLicenseData(await resLic.json());
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e.message || 'Erro ao salvar dados do emitente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatDate = (isoString: string) => {
    if (!isoString) return 'Nunca';
    try {
      return new Date(isoString).toLocaleString('pt-BR');
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Cadastro do Emitente & Licença</h1>
              <p className="text-xs text-slate-400">
                Dados cadastrais, endereço completo, Inscrição Estadual e validação fiscal
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Verificando...' : 'Verificar Licença VPS'}</span>
        </button>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Status da Licença */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status da Licença</span>
          <div className="flex items-center gap-2">
            {licenseData?.isBlocked ? (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>BLOQUEADO / SUSPENSO</span>
              </span>
            ) : licenseData?.status === 'TOLERANCIA_OFFLINE' ? (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>TOLERÂNCIA OFFLINE ({licenseData?.daysRemaining}d restantes)</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>LICENÇA LIBERADA</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {licenseData?.isBlocked
              ? licenseData?.reason
              : 'Acesso total liberado para frente de caixa e banco de dados.'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Última Validação</span>
          <p className="font-extrabold text-slate-800 text-sm">
            {formatDate(licenseData?.lastContactDate)}
          </p>
          <p className="text-[11px] text-slate-400">
            {licenseData?.daysOffline > 0
              ? `Verificado há ${licenseData?.daysOffline} dia(s)`
              : 'Verificação em dia com sucesso'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tolerância Offline</span>
          <p className="font-extrabold text-indigo-600 text-sm">Até 5 Dias (120h)</p>
          <p className="text-[11px] text-slate-400">
            Opera normalmente sem internet por até 5 dias.
          </p>
        </div>
      </div>

      {/* Formulário Completo do Emitente */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Bloco 1: Dados Fiscais & Identificação */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">1. Identificação Fiscal do Emitente</h3>
              <p className="text-xs text-slate-400">Dados oficiais da empresa e registro perante a Receita Federal e SEFAZ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Razão Social */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Razão Social (Nome Empresarial) *
              </label>
              <input
                type="text"
                required
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                placeholder="Ex: Minha Empresa Comercial LTDA"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Nome Fantasia */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome Fantasia (Nome Comercial)
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Padaria Central"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* CNPJ com Validação Visual */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  CNPJ do Emitente *
                </label>
                {cnpjValid ? (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>CNPJ VÁLIDO</span>
                  </span>
                ) : cnpjError ? (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    {cnpjError}
                  </span>
                ) : null}
              </div>
              <input
                type="text"
                required
                value={cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className={`w-full p-3 rounded-xl border text-sm font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
                  cnpjValid
                    ? 'border-emerald-400 focus:ring-emerald-500'
                    : cnpjError
                    ? 'border-rose-400 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Validação oficial por algoritmo de dígitos verificadores
              </p>
            </div>

            {/* Inscrição Estadual (IE) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Inscrição Estadual (IE) *
                </label>
                <button
                  type="button"
                  onClick={() => setInscricaoEstadual('ISENTO')}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Marcar como ISENTO
                </button>
              </div>
              <input
                type="text"
                required
                value={inscricaoEstadual}
                onChange={(e) => setInscricaoEstadual(e.target.value)}
                placeholder="Ex: 123.456.789.000 ou ISENTO"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Obrigatório para emissão de cupom e NFe/NFCe (ou marque ISENTO)
              </p>
            </div>

            {/* Inscrição Municipal (IM) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Inscrição Municipal (IM)
              </label>
              <input
                type="text"
                value={inscricaoMunicipal}
                onChange={(e) => setInscricaoMunicipal(e.target.value)}
                placeholder="Ex: 987654321 (Opcional)"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Identificação perante a Prefeitura local (se aplicável)
              </p>
            </div>
          </div>
        </div>

        {/* Bloco 2: Endereço Completo do Emitente com Busca de CEP */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">2. Endereço Completo do Estabelecimento</h3>
              <p className="text-xs text-slate-400">Localização física para recibos, comprovantes e identificação fiscal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* CEP com Busca Automática */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                CEP (com busca automática) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className="w-full p-3 pr-10 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => searchCep()}
                  disabled={isSearchingCep}
                  title="Buscar Endereço pelo CEP"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Search className={`w-4 h-4 ${isSearchingCep ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
              {cepError ? (
                <p className="text-[11px] text-rose-600 mt-1 font-bold">{cepError}</p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">Busca automática via Correios / ViaCEP</p>
              )}
            </div>

            {/* Logradouro */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Logradouro (Rua, Av, Travessa) *
              </label>
              <input
                type="text"
                required
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                placeholder="Ex: Av. Brasil"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Número */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Número *
              </label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 1000 ou S/N"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Complemento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Complemento
              </label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Ex: Sala 02, Galpão A"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bairro */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Bairro *
              </label>
              <input
                type="text"
                required
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex: Centro"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Cidade */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Município / Cidade *
              </label>
              <input
                type="text"
                required
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Estado (UF) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estado (UF) *
              </label>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ESTADOS_BRASIL.map((st) => (
                  <option key={st.sigla} value={st.sigla}>
                    {st.sigla} - {st.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bloco 3: Contatos e Cupom */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Phone className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">3. Contatos & Rodapé do Cupom de Venda</h3>
              <p className="text-xs text-slate-400">Informações impressas no recibo e canais de atendimento</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Telefone / WhatsApp da Loja
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail de Contato
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mensagem do Rodapé do Cupom Não Fiscal
              </label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Obrigado pela preferência! Volte sempre."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? 'Salvando Cadastro...' : 'Salvar Dados do Emitente'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
