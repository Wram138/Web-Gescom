'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Percent,
  ShieldCheck,
  Store,
  UserCheck,
  X,
  Smartphone,
  Building2,
} from 'lucide-react';
import VersionBadge from './VersionBadge';
import { useSidebar } from '@/context/SidebarContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { canAccess } = useAuth();
  const { isMobileOpen, closeMobile } = useSidebar();

  const allLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { href: '/pdv', label: 'Frente de Caixa (PDV)', icon: ShoppingCart, highlight: true, module: 'pdv' },
    { href: '/produtos', label: 'Estoque & Produtos', icon: Package, module: 'produtos' },
    { href: '/pessoas', label: 'Pessoas', icon: Users, module: 'clientes' },
    { href: '/vendas', label: 'Vendas & Histórico', icon: Receipt, module: 'vendas' },
    { href: '/caixa', label: 'Turno de Caixa', icon: Wallet, module: 'caixa' },
    { href: '/comissoes', label: 'Comissões', icon: Percent, module: 'comissoes' },
    { href: '/contas-pagar', label: 'Contas a Pagar', icon: ArrowDownCircle, module: 'contas_pagar' },
    { href: '/contas-receber', label: 'Contas a Receber', icon: ArrowUpCircle, module: 'contas_receber' },
    { href: '/usuarios', label: 'Usuários & Perfis', icon: Users, module: 'usuarios' },
    { href: '/empresa', label: 'Empresa & Licença', icon: Building2, module: 'usuarios' },
  ];

  // Filtra apenas os itens permitidos para o perfil do usuário
  const allowedLinks = allLinks.filter((item) => canAccess(item.module));

  return (
    <>
      {/* Backdrop escuro para fechar ao tocar fora no Mobile */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar: Recolhida no mobile (desliza sob demanda), fixa no desktop */}
      <aside
        className={`bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800 transition-transform duration-300 ease-in-out z-50
          ${
            isMobileOpen
              ? 'fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl translate-x-0'
              : 'fixed -translate-x-full md:translate-x-0 md:static md:w-64'
          }
        `}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide text-white">Web-Gescom</h1>
              <p className="text-xs text-blue-400 font-medium">PDV & Gestão Comercial</p>
            </div>
          </div>

          {/* Botão recolher no mobile */}
          <button
            type="button"
            onClick={closeMobile}
            className="md:hidden p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Recolher Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Atalho Especial: Terminal de Bolso Mobile */}
        <div className="p-3 pb-1">
          <Link
            href="/mobile"
            onClick={closeMobile}
            className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-between shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-200" />
              <span>Terminal Celular</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black tracking-wider">
              MOBILE
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {allowedLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.highlight) {
              return (
                <div key={item.href} className="py-1.5">
                  <Link
                    href={item.href}
                    onClick={closeMobile}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all shadow-md ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-blue-600/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/30'
                    }`}
                  >
                    <Icon className="w-5 h-5 animate-pulse" />
                    <span>{item.label}</span>
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-blue-400 border-l-4 border-blue-500 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-slate-300">Banco SQLite Local</span>
          </div>
          <p className="text-[11px] text-slate-400">gescom.db ativo e seguro</p>

          {/* Contador de Versão e Atualizações */}
          <VersionBadge variant="sidebar" />
        </div>
      </aside>
    </>
  );
}
