'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LoginScreen from '@/components/LoginScreen';
import LicenseLockScreen from '@/components/LicenseLockScreen';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const isMobileRoute = pathname?.startsWith('/mobile');

  // Estado do licenciamento VPS e regra dos 5 dias
  const [licenseState, setLicenseState] = useState<any>(null);
  const [isLicenseLoading, setIsLicenseLoading] = useState(true);

  const checkLicense = async () => {
    try {
      const res = await fetch('/api/license');
      if (res.ok) {
        const data = await res.json();
        setLicenseState(data);
      }
    } catch {
    } finally {
      setIsLicenseLoading(false);
    }
  };

  useEffect(() => {
    checkLicense();

    // Consulta ativa ao servidor VPS na inicialização
    fetch('/api/license', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => setLicenseState(d))
      .catch(() => {});

    // Sincroniza periodicamente a cada 10 minutos
    const interval = setInterval(() => {
      fetch('/api/license', { method: 'POST' })
        .then((r) => r.json())
        .then((d) => setLicenseState(d))
        .catch(() => {});
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading || isLicenseLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // SE A LICENÇA ESTIVER BLOQUEADA (INADIMPLÊNCIA OU > 5 DIAS OFFLINE), BLOQUEIA DESKTOP E CELULAR
  if (licenseState?.isBlocked) {
    return <LicenseLockScreen licenseInfo={licenseState} onRefresh={checkLicense} />;
  }

  // Rota mobile do celular possui seu próprio fluxo otimizado de autenticação e layout
  if (isMobileRoute) {
    return <div className="h-screen w-screen overflow-hidden bg-slate-100">{children}</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Banner de alerta se estiver nos últimos 2 dias da tolerância de 5 dias */}
          {licenseState?.daysRemaining !== undefined && licenseState.daysRemaining <= 2 && (
            <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm z-30">
              <span>
                ⚠️ Aviso de Licença: Sistema sem contato com a VPS há {licenseState.daysOffline} dia(s). Restam{' '}
                {licenseState.daysRemaining} dia(s) de tolerância antes do bloqueio automático. Conecte à internet!
              </span>
              <button
                onClick={checkLicense}
                className="px-2.5 py-1 bg-amber-950 text-white rounded font-bold hover:bg-amber-900 text-[11px] ml-2"
              >
                Sincronizar
              </button>
            </div>
          )}

          <Header />
          <main className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-5 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

