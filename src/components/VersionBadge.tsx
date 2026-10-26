'use client';

import React, { useState, useEffect } from 'react';
import VersionModal from './VersionModal';
import { GitBranch, Sparkles } from 'lucide-react';

interface VersionBadgeProps {
  variant?: 'sidebar' | 'header' | 'login' | 'mobile';
  className?: string;
}

export default function VersionBadge({ variant = 'sidebar', className = '' }: VersionBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [versionData, setVersionData] = useState<{ version: string; build: number } | null>(null);

  useEffect(() => {
    fetchVersion();
  }, []);

  const fetchVersion = async () => {
    try {
      const res = await fetch('/api/version');
      if (res.ok) {
        const json = await res.json();
        setVersionData({ version: json.version, build: json.build });
      }
    } catch {
      setVersionData({ version: '1.0.0', build: 1 });
    }
  };

  const displayText = versionData
    ? `v${versionData.version} (Build #${versionData.build})`
    : 'v1.0.0';

  return (
    <>
      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`w-full mt-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition-all group flex items-center justify-between ${className}`}
          title="Clique para ver o histórico de alterações e versões"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-ping" />
            <div>
              <p className="text-[11px] font-mono font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                {displayText}
              </p>
              <p className="text-[9px] text-slate-400">Ver atualizações</p>
            </div>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
        </button>
      )}

      {variant === 'header' && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-mono font-semibold transition-all ${className}`}
          title="Ver histórico de versões e alterações"
        >
          <GitBranch className="w-3 h-3 text-slate-500" />
          <span>{displayText}</span>
        </button>
      )}

      {variant === 'login' && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`text-[11px] font-mono font-semibold text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 ${className}`}
          title="Clique para ver as novidades desta versão"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Web-Gescom {displayText}</span>
        </button>
      )}

      {variant === 'mobile' && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 w-full py-2 ${className}`}
        >
          <span>Web-Gescom Mobile {displayText}</span>
        </button>
      )}

      <VersionModal isOpen={modalOpen} onClose={() => {
        setModalOpen(false);
        fetchVersion();
      }} />
    </>
  );
}

