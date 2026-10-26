'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Lock,
  Phone,
  FileText,
} from 'lucide-react';

export default function EmpresaLicencaPage() {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [licenseData, setLicenseData] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchLicenseData();
  }, []);

  const fetchLicenseData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/license');
      if (res.ok) {
        const data = await res.json();
        setLicenseData(data);
        if (data.config) {
          setRazaoSocial(data.config.razaoSocial || '');
          setNomeFantasia(data.config.nomeFantasia || '');
          setCnpj(data.config.cnpj || '');
          setPhone(data.config.phone || '');
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
          message: 'Licença sincronizada com sucesso! Servidor VPS respondeu com autorização válida.',
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/license', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razaoSocial,
          nomeFantasia,
          cnpj,
          phone,
        }),
      });
      const data = await res.json();
      setLicenseData(data);
      if (data.isBlocked) {
        setFeedback({
          type: 'error',
          message: data.reason || 'Configurações salvas, mas o servidor retornou bloqueio.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Dados da empresa atualizados e sincronizados com sucesso!',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao salvar: ' + e.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dados do Emitente & Licença</h1>
              <p className="text-xs text-slate-400">Identificação fiscal da empresa e conexão com o servidor VPS</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Verificando...' : 'Verificar Licença Agora'}</span>
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
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Última Validação da Licença</span>
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
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Regra de Tolerância</span>
          <p className="font-extrabold text-indigo-600 text-sm">Até 5 Dias Offline (120h)</p>
          <p className="text-[11px] text-slate-400">
            Permite vendas normais sem internet por até 5 dias. Após esse prazo, bloqueia.
          </p>
        </div>
      </div>

      {/* Formulário de Configurações */}
      <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="font-extrabold text-slate-800 text-base mb-1">Configuração do Emitente</h3>
          <p className="text-xs text-slate-400">Estes dados são validados contra o cadastro da sua licença na VPS</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Razão Social da Empresa *
            </label>
            <input
              type="text"
              required
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Nome Fantasia da Loja
            </label>
            <input
              type="text"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              CNPJ do Emitente *
            </label>
            <input
              type="text"
              required
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full p-3 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Telefone / WhatsApp de Contato
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Removido exibição exposta do endereço de validação conforme solicitado */}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando & Sincronizando...' : 'Salvar e Sincronizar Licença'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

