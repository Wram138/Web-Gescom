'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GitCommit, Sparkles, X, Plus, Calendar, Clock, CheckCircle2, History } from 'lucide-react';

interface VersionItem {
  version: string;
  build: number;
  date: string;
  title: string;
  description: string;
}

interface VersionData {
  version: string;
  build: number;
  updatedAt: string;
  history: VersionItem[];
}

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionModal({ isOpen, onClose }: VersionModalProps) {
  const { user } = useAuth();
  const [data, setData] = useState<VersionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewChangeForm, setShowNewChangeForm] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [bumpType, setBumpType] = useState('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVersion = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/version');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersion();
    }
  }, [isOpen]);

  const handleRegisterChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          bumpType: bumpType !== 'none' ? bumpType : undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        setNewTitle('');
        setNewDesc('');
        setBumpType('none');
        setShowNewChangeForm(false);
      }
    } catch {
      alert('Erro ao registrar nova versão');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-lg">Versão & Atualizações</h3>
                {data && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700">
                    v{data.version} • Build #{data.build}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Histórico detalhado de melhorias e contador de alterações
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status pill */}
        {data && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>
                Última compilação: <strong>{formatDate(data.updatedAt)}</strong>
              </span>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setShowNewChangeForm(!showNewChangeForm)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showNewChangeForm ? 'Cancelar' : 'Registrar Alteração (+1 Build)'}</span>
              </button>
            )}
          </div>
        )}

        {/* Admin Form: Add New Change */}
        {showNewChangeForm && (
          <form
            onSubmit={handleRegisterChange}
            className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 animate-fadeIn text-xs"
          >
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Registrar Nova Alteração no Contador de Versão</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Título da Modificação *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ajuste no cálculo de desconto de revenda..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Incrementar Versão</label>
                <select
                  value={bumpType}
                  onChange={(e) => setBumpType(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
                >
                  <option value="none">Apenas +1 Build (Revisão)</option>
                  <option value="patch">Patch (ex: 1.0.1)</option>
                  <option value="minor">Minor (ex: 1.1.0)</option>
                  <option value="major">Major (ex: 2.0.0)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Descrição / Detalhes</label>
              <textarea
                rows={2}
                placeholder="Detalhes adicionais do que foi alterado..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewChangeForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-sm"
              >
                {isSubmitting ? 'Gravando...' : 'Salvar Alteração'}
              </button>
            </div>
          </form>
        )}

        {/* Timeline of changes */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && !data ? (
            <div className="text-center py-10 text-slate-400">Carregando histórico...</div>
          ) : data?.history?.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Nenhum registro de versão.</div>
          ) : (
            data?.history?.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-100 text-blue-700">
                      Build #{item.build}
                    </span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.date}</span>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-600 leading-relaxed pl-1">{item.description}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t flex items-center justify-between text-xs text-slate-400">
          <span>Web-Gescom Comercial • Sistema Portátil</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

