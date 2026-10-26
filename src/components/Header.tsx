'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserCheck, Shield, RefreshCw, LogOut, CheckCircle2, AlertCircle, Lock, ArrowRight, X, Menu } from 'lucide-react';
import VersionBadge from './VersionBadge';
import { useSidebar } from '@/context/SidebarContext';

export default function Header() {
  const { user, login, logout } = useAuth();
  const { toggleMobile } = useSidebar();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [cashStatus, setCashStatus] = useState<any>(null);

  // Estados da troca de operador com senha
  const [selectedUserForSwitch, setSelectedUserForSwitch] = useState<any>(null);
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchCashStatus();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.filter((u: any) => u.active));
      }
    } catch { }
  };

  const fetchCashStatus = async () => {
    try {
      const res = await fetch('/api/cash-register');
      if (res.ok) {
        const data = await res.json();
        setCashStatus(data);
      }
    } catch { }
  };

  const handleOpenSwitchModal = () => {
    setSelectedUserForSwitch(null);
    setSwitchPassword('');
    setSwitchError('');
    setShowSwitchModal(true);
  };

  const handleSelectUser = (u: any) => {
    setSelectedUserForSwitch(u);
    setSwitchPassword('');
    setSwitchError('');
  };

  const handleConfirmSwitchWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForSwitch) return;
    if (!switchPassword) {
      setSwitchError('Informe a senha do usuário');
      return;
    }

    setIsSwitching(true);
    setSwitchError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUserForSwitch.username,
          password: switchPassword,
        }),
      });

      if (res.ok) {
        const userData = await res.json();
        login(userData);
        setShowSwitchModal(false);
      } else {
        const err = await res.json();
        setSwitchError(err.error || 'Senha incorreta!');
      }
    } catch (e: any) {
      setSwitchError('Erro de conexão: ' + e.message);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shadow-sm flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Botão Hambúrguer Mobile para abrir/recolher o menu */}
        <button
          type="button"
          onClick={toggleMobile}
          className="md:hidden p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Abrir Menu Lateral"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Caixa Status */}
        {cashStatus?.summary?.isFromPreviousDay ? (
          <a
            href="/caixa"
            className="flex items-center gap-1.5 bg-rose-100 text-rose-800 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold border border-rose-300 animate-pulse hover:bg-rose-200 transition-colors"
            title="Caixa de dia anterior sem fechar. Fechamento obrigatório!"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
            <span className="hidden sm:inline">⚠️ Caixa Pendente ({cashStatus.summary.openedDateFormatted}) - Fechar</span>
            <span className="sm:hidden font-bold">Fechar Caixa Ant.</span>
          </a>
        ) : cashStatus?.active ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Caixa Aberto por {cashStatus.register?.user?.name || 'Operador'}</span>
            <span className="sm:hidden font-bold">Aberto</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Caixa Fechado</span>
          </div>
        )}

        {/* Badge Contador de Versão */}
        <div className="hidden sm:block">
          <VersionBadge variant="header" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Usuário Atual */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Administrador'}</p>
            <span className="text-[10px] uppercase font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>

        {/* Botão de Troca Rápida de Usuário */}
        <button
          onClick={handleOpenSwitchModal}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          title="Alternar Operador"
        >
          <UserCheck className="w-4 h-4" />
          <span className="hidden md:inline">Trocar</span>
        </button>

        {/* Botão de Bloquear Tela */}
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-medium transition-colors border border-rose-200 cursor-pointer"
          title="Bloquear Sistema e Exigir Login"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Bloquear</span>
        </button>
      </div>

      {/* MODAL DE TROCA DE OPERADOR COM EXIGÊNCIA DE SENHA */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Trocar de Operador</h3>
                <p className="text-xs text-slate-500">
                  {selectedUserForSwitch
                    ? 'Confirme a senha para alternar'
                    : 'Selecione quem assumirá o sistema'}
                </p>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {switchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{switchError}</span>
              </div>
            )}

            {!selectedUserForSwitch ? (
              // Passo 1: Escolha do Operador
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {usersList.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      user?.id === u.id
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">@{u.username}</p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              // Passo 2: Digitação da Senha do Operador Escolhido
              <form onSubmit={handleConfirmSwitchWithPassword} className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-semibold">Novo Operador:</span>
                    <span className="text-sm font-bold text-slate-800">{selectedUserForSwitch.name}</span>
                    <span className="text-xs text-slate-500 block">@{selectedUserForSwitch.username}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserForSwitch(null)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    Alterar
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Senha de Acesso de {selectedUserForSwitch.name} *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      autoFocus
                      required
                      placeholder="Digite a senha..."
                      value={switchPassword}
                      onChange={(e) => setSwitchPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForSwitch(null)}
                    className="flex-1 py-2.5 border rounded-xl font-bold text-slate-700 text-xs hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSwitching}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5"
                  >
                    <span>{isSwitching ? 'Validando...' : 'Entrar'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {!selectedUserForSwitch && (
              <button
                onClick={() => setShowSwitchModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
