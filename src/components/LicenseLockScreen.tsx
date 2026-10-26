'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Phone,
  Globe,
  Lock,
  Building2,
  Clock,
  CheckCircle2,
  Send,
  Sparkles,
  Pencil,
  X,
} from 'lucide-react';
import { validateCNPJ } from '@/lib/validators';

interface LicenseLockScreenProps {
  licenseInfo: {
    status?: 'LIBERADO' | 'BLOQUEADO' | 'TOLERANCIA_OFFLINE' | 'PENDENTE' | 'NAO_LICENCIADO';
    reason?: string;
    cnpj?: string;
    razaoSocial?: string;
    nomeFantasia?: string;
    phone?: string;
    daysOffline?: number;
    vpsUrl?: string;
  };
  onRefresh: () => void;
}

export default function LicenseLockScreen({ licenseInfo, onRefresh }: LicenseLockScreenProps) {
  const isUnlicensed = licenseInfo.status === 'NAO_LICENCIADO' || !licenseInfo.cnpj;
  const isPending = licenseInfo.status === 'PENDENTE';
  const isBlocked = licenseInfo.status === 'BLOQUEADO' || (!isUnlicensed && !isPending);

  // Form states para primeira ativação (NAO_LICENCIADO)
  const [cnpj, setCnpj] = useState(licenseInfo.cnpj || '');
  const [razaoSocial, setRazaoSocial] = useState(licenseInfo.razaoSocial || '');
  const [nomeFantasia, setNomeFantasia] = useState(licenseInfo.nomeFantasia || '');
  const [phone, setPhone] = useState(licenseInfo.phone || '');
  const [showEditCnpj, setShowEditCnpj] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Auto-polling quando estiver PENDENTE: verifica a cada 8 segundos se o admin já liberou
  useEffect(() => {
    if (!isPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/license', { method: 'POST' });
        const data = await res.json();
        if (!data.isBlocked) {
          setFeedback({
            type: 'success',
            message: 'Licença liberada pelo administrador! Entrando no sistema...',
          });
          setTimeout(() => {
            onRefresh();
            window.location.reload();
          }, 1200);
        }
      } catch {}
    }, 8000);

    return () => clearInterval(interval);
  }, [isPending, onRefresh]);

  // Formatação automática do CNPJ
  const handleCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    if (raw.length <= 2) {
      setCnpj(raw);
    } else if (raw.length <= 5) {
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2)}`);
    } else if (raw.length <= 8) {
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`);
    } else if (raw.length <= 12) {
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`);
    } else {
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`);
    }
  };

  // Solicitar Ativação de Licença (Primeira Abertura)
  const handleRequestActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnpj.trim() || !razaoSocial.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o CNPJ e a Razão Social da empresa.' });
      return;
    }

    const cnpjCheck = validateCNPJ(cnpj);
    if (!cnpjCheck.valid) {
      setFeedback({ type: 'error', message: 'CNPJ inválido: ' + (cnpjCheck.error || 'Dígito verificador incorreto.') });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_ACTIVATION',
          cnpj: cnpj.trim(),
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();

      if (!data.isBlocked) {
        setFeedback({
          type: 'success',
          message: 'Licença confirmada e liberada com sucesso! Entrando no sistema...',
        });
        setTimeout(() => {
          onRefresh();
          window.location.reload();
        }, 1200);
      } else if (data.status === 'PENDENTE') {
        setFeedback({
          type: 'success',
          message: 'Solicitação enviada com sucesso! Aguardando o administrador liberar no servidor.',
        });
        setTimeout(() => {
          onRefresh();
        }, 1000);
      } else {
        setFeedback({
          type: 'error',
          message: data.reason || 'Não foi possível validar a licença no servidor.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao conectar ao servidor de ativação: ' + err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Botão de checagem manual
  const handleCheckNow = async () => {
    setIsChecking(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/license', { method: 'POST' });
      const data = await res.json();

      if (!data.isBlocked) {
        setFeedback({
          type: 'success',
          message: 'Licença confirmada e liberada! Carregando sistema...',
        });
        setTimeout(() => {
          onRefresh();
          window.location.reload();
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          message: data.reason || 'A licença ainda não foi liberada pelo administrador.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Falha de comunicação com o servidor de validação: ' + err.message,
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-50 flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
        {/* Glow de fundo */}
        <div
          className={`absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isUnlicensed
              ? 'bg-blue-600/15'
              : isPending
              ? 'bg-amber-600/15'
              : 'bg-rose-600/15'
          }`}
        ></div>

        {/* FEEDBACK TOAST */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950 border border-rose-800 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* ========================================================
            MODO 1: PRIMEIRA ABERTURA COM BANCO ZERADO (NÃO LICENCIADO)
           ======================================================== */}
        {isUnlicensed && (
          <>
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-blue-950/80 border border-blue-700/80 text-blue-400 flex items-center justify-center mx-auto shadow-2xl shadow-blue-900/50">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-blue-950 text-blue-300 border border-blue-800 uppercase tracking-widest inline-block mb-2">
                  PRIMEIRA INICIALIZAÇÃO
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Ativação de Licença
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Insira o CNPJ da empresa para solicitar a liberação de acesso junto à central Gescom.
                </p>
              </div>
            </div>

            {/* Endereço do Servidor Fixo */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Servidor de Validação:</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-blue-300">
                <span>valida.alecrim.tec.br</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-400 border border-blue-800 font-bold">
                  SSL SEGURO
                </span>
              </div>
            </div>

            {/* Formulário de Ativação Inicial */}
            <form onSubmit={handleRequestActivation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  CNPJ da Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-base font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Razão Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Comercial Alecrim LTDA"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-semibold placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Alecrim PDV"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando Solicitação...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Solicitar Liberação de Licença</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* ========================================================
            MODO 2: SOLICITAÇÃO ENVIADA - AGUARDANDO LIBERAÇÃO NO SERVIDOR
           ======================================================== */}
        {isPending && (
          <>
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-amber-950/80 border border-amber-600/80 text-amber-400 flex items-center justify-center mx-auto shadow-2xl shadow-amber-900/50 animate-pulse">
                <Clock className="w-10 h-10" />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-950 text-amber-300 border border-amber-800 uppercase tracking-widest inline-block mb-2">
                  AGUARDANDO LIBERAÇÃO
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Solicitação em Análise
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Sua solicitação foi enviada para nossa central e aguarda aprovação pelo administrador.
                </p>
              </div>
            </div>

            {/* Dados do Solicitante */}
            <div className="bg-slate-950/60 border border-amber-800/40 rounded-2xl p-4 space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-slate-500 font-bold uppercase text-[10px]">Empresa:</span>
                  <span className="text-white font-bold">{licenseInfo.razaoSocial || razaoSocial || 'Não informada'}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-bold uppercase text-[10px]">CNPJ Solicitado:</span>
                  <span className="text-amber-300 font-mono font-bold">{licenseInfo.cnpj || cnpj}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Servidor VPS:</span>
                <span className="font-mono text-slate-300 font-bold">valida.alecrim.tec.br</span>
              </div>
            </div>

            {/* Mensagem Explicativa */}
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-2xl p-4 text-xs space-y-2 text-amber-200">
              <p className="font-bold flex items-center gap-2 text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>O que acontece agora?</span>
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                O administrador recebeu seu pedido e irá liberar o acesso através do painel de controle.
                Assim que for aprovado, este aplicativo será desbloqueado automaticamente.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-amber-400 font-semibold pt-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Consultando liberação automaticamente a cada 8 segundos...</span>
              </div>
            </div>

            {/* Ação manual */}
            <div className="space-y-2">
              <button
                onClick={handleCheckNow}
                disabled={isChecking}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Verificando no Servidor...' : 'Verificar Liberação Agora'}</span>
              </button>
            </div>
          </>
        )}

        {/* ========================================================
            MODO 3: SISTEMA BLOQUEADO (INADIMPLÊNCIA OU > 5 DIAS OFFLINE)
           ======================================================== */}
        {isBlocked && (
          <>
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-rose-950/80 border border-rose-700/80 text-rose-500 flex items-center justify-center mx-auto shadow-2xl shadow-rose-900/50 animate-pulse">
                <Lock className="w-10 h-10" />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-950 text-rose-300 border border-rose-800 uppercase tracking-widest inline-block mb-2">
                  ACESSO TEMPORARIAMENTE SUSPENSO
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Sistema Bloqueado
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  O acesso ao Frente de Caixa (PDV) e ao banco de dados está interrompido
                </p>
              </div>
            </div>

            {/* Motivo do Bloqueio */}
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 sm:p-5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Motivo da Suspensão:</span>
              </div>
              <p className="text-rose-200 leading-relaxed font-medium">
                {licenseInfo.reason ||
                  'Licença suspensa por pendência financeira junto à administração do software.'}
              </p>

              <div className="pt-2 border-t border-rose-900/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  <span className="block text-slate-500 font-bold uppercase">Empresa:</span>
                  <span className="text-slate-200 font-bold">
                    {licenseInfo.razaoSocial || 'Não informada'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 font-bold uppercase">CNPJ:</span>
                  <span className="text-slate-200 font-mono font-bold">
                    {licenseInfo.cnpj || 'Não informado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Instruções de Regularização */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
              <p className="font-bold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400" />
                <span>Como restabelecer o acesso:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
                <li>Entre em contato com o suporte para regularizar a assinatura mensal.</li>
                <li>Após a confirmação da administração, certifique-se de que há conexão com a internet.</li>
                <li>Clique no botão abaixo para revalidar a licença e desbloquear o sistema imediatamente.</li>
              </ol>
            </div>

            {/* Ações */}
            <div className="space-y-3">
              <button
                onClick={handleCheckNow}
                disabled={isChecking}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Consultando Servidor...' : 'Verificar Pagamento / Revalidar Licença'}</span>
              </button>

              {!showEditCnpj ? (
                <button
                  type="button"
                  onClick={() => setShowEditCnpj(true)}
                  className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-400" />
                  <span>Corrigir ou Alterar CNPJ / Razão Social</span>
                </button>
              ) : (
                <div className="bg-slate-950 p-4 rounded-2xl border border-blue-900/60 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" />
                      Alterar CNPJ para Validação
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEditCnpj(false)}
                      className="text-slate-400 hover:text-white text-xs p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleRequestActivation} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Novo CNPJ *
                      </label>
                      <input
                        type="text"
                        required
                        value={cnpj}
                        onChange={(e) => handleCnpjChange(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-sm font-bold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Razão Social *
                      </label>
                      <input
                        type="text"
                        required
                        value={razaoSocial}
                        onChange={(e) => setRazaoSocial(e.target.value)}
                        placeholder="Nome Empresarial da Empresa"
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Enviando...' : 'Salvar e Solicitar Licença'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEditCnpj(false)}
                        className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pt-1 text-slate-500 text-[11px]">
                <span>Servidor: valida.alecrim.tec.br</span>
                <span>Tolerância offline: até 5 dias</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
