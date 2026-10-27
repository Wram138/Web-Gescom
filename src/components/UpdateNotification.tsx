'use client';

import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle, Sparkles, CheckCircle2, X } from 'lucide-react';

interface UpdateState {
  currentVersion: string;
  targetVersion?: string;
  hasUpdate: boolean;
  mandatory: boolean;
  notes?: string;
  downloadUrl?: string;
  isDownloading: boolean;
  readyToApply: boolean;
  downloadProgress: number;
  error?: string | null;
}

export default function UpdateNotification() {
  const [update, setUpdate] = useState<UpdateState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/system/update');
      if (res.ok) {
        const data: UpdateState = await res.json();
        setUpdate(data);
        if (data.hasUpdate && !dismissed) {
          setIsOpen(true);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();

    // Polling a cada 2 minutos
    const interval = setInterval(fetchStatus, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dismissed]);

  // Polling acelerado a cada 1.5s enquanto estiver baixando
  useEffect(() => {
    if (update?.isDownloading) {
      const downloadInterval = setInterval(fetchStatus, 1500);
      return () => clearInterval(downloadInterval);
    }
  }, [update?.isDownloading]);

  if (!update || !update.hasUpdate || (dismissed && !update.mandatory)) {
    return null;
  }

  const handleDownload = async () => {
    try {
      setIsActionLoading(true);
      const res = await fetch('/api/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DOWNLOAD' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Erro ao iniciar download: ' + (data.error || 'Falha na conexão'));
      }
      fetchStatus();
    } catch (e: any) {
      alert('Erro: ' + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApply = async () => {
    if (!confirm('O sistema será reiniciado agora para concluir a instalação da nova versão. Deseja prosseguir?')) {
      return;
    }

    try {
      setIsApplying(true);
      const res = await fetch('/api/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPLY' }),
      });
      const data = await res.json();
      if (res.ok) {
        // Exibe mensagem de reinicialização
      } else {
        alert('Erro ao aplicar atualização: ' + (data.error || 'Falha'));
        setIsApplying(false);
      }
    } catch (e: any) {
      // Se der fetch error por shutdown do servidor Node, é normal
      console.log('Reiniciando processo...');
    }
  };

  const handleDismiss = () => {
    if (update.mandatory) return;
    setDismissed(true);
    setIsOpen(false);
  };

  // Se a atualização for mandatória, exibe tela de bloqueio com aviso
  if (update.mandatory && !update.readyToApply && !update.isDownloading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Atualização Obrigatória</h3>
              <p className="text-xs text-amber-400 font-semibold">Nova versão v{update.targetVersion} disponível</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            O administrador do sistema comandou uma atualização obrigatória para esta unidade.
            Seus dados locais, vendas e produtos permanecerão 100% seguros e intactos.
          </p>

          {update.notes && (
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
              <span className="font-bold text-slate-200 block mb-1">Novidades da versão:</span>
              <p className="text-slate-400">{update.notes}</p>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={isActionLoading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isActionLoading ? 'Iniciando download...' : 'Baixar e Instalar Agora'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Janela / Card Flutuante de Atualização
  return (
    <>
      {/* Botão flutuante quando minimizado */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xl shadow-emerald-600/30 flex items-center gap-2 border border-emerald-400/40 animate-bounce cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Atualização v{update.targetVersion} disponível!</span>
        </button>
      )}

      {/* Card expandido no canto inferior direito */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border-2 border-emerald-500/80 rounded-3xl p-5 shadow-2xl text-white space-y-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm leading-tight text-white">Nova Versão Disponível</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-mono text-slate-400">v{update.currentVersion}</span>
                  <span className="text-[10px] text-emerald-400">➔</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-300">v{update.targetVersion}</span>
                </div>
              </div>
            </div>

            {!update.mandatory && !update.isDownloading && !isApplying && (
              <button
                onClick={handleDismiss}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
                title="Dispensar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {update.notes && (
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 max-h-24 overflow-y-auto">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-0.5">Notas do Administrador:</span>
              <p className="text-slate-300 leading-relaxed text-[11px]">{update.notes}</p>
            </div>
          )}

          {/* Feedback de Download em Progresso */}
          {update.isDownloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Baixando atualização do GitHub...</span>
                </span>
                <span className="font-mono text-emerald-400">{update.downloadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${update.downloadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Estado de Pronto para Instalar */}
          {update.readyToApply && !isApplying && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Pacote baixado e verificado!</span>
              </div>
              <p className="text-[11px] text-emerald-300/80">
                O banco de dados SQLite local permanecerá 100% seguro.
              </p>
            </div>
          )}

          {/* Estado de Reiniciando */}
          {isApplying && (
            <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-700 text-indigo-200 text-xs text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
              <p className="font-extrabold text-white text-sm">Reiniciando o sistema...</p>
              <p className="text-[11px] text-indigo-300">Aplicando os novos arquivos e abrindo o Web-Gescom atualizado.</p>
            </div>
          )}

          {/* Botões de Ação */}
          {!update.isDownloading && !isApplying && (
            <div className="flex items-center justify-end gap-2 pt-1">
              {!update.readyToApply ? (
                <button
                  onClick={handleDownload}
                  disabled={isActionLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isActionLoading ? 'Iniciando...' : 'Baixar Atualização'}</span>
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/40 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Instalar e Reiniciar Agora</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
