'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Minus,
  Printer,
  FileText,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

export default function CaixaPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'SUPRIMENTO' | 'SANGRIA'>('SANGRIA');

  // Form states
  const [initialAmount, setInitialAmount] = useState<number>(100);
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState<string>('');

  // Estados do Fechamento às Cegas
  const [reportedCash, setReportedCash] = useState<number | ''>('');
  const [reportedCard, setReportedCard] = useState<number | ''>('');
  const [reportedPix, setReportedPix] = useState<number | ''>('');
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // Comprovante pós-fechamento para conferência gerencial
  const [closingAuditData, setClosingAuditData] = useState<any>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  useEffect(() => {
    loadRegister();
  }, [user]);

  const loadRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cash-register');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          userId: user?.id || 'admin-id',
          initialAmount: Number(initialAmount),
        }),
      });

      if (res.ok) {
        setShowOpenModal(false);
        loadRegister();
      } else {
        const err = await res.json();
        alert('Erro ao abrir caixa: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.register?.id) return;

    setIsSubmittingClose(true);
    try {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          cashRegisterId: data.register.id,
          reportedCash: Number(reportedCash) || 0,
          reportedCard: Number(reportedCard) || 0,
          reportedPix: Number(reportedPix) || 0,
          operatorNotes,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setShowCloseModal(false);
        setClosingAuditData(json.closingAudit);
        setShowVoucherModal(true);
        setReportedCash('');
        setReportedCard('');
        setReportedPix('');
        setOperatorNotes('');
        loadRegister();
      } else {
        const err = await res.json();
        alert('Erro ao fechar caixa: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.register?.id) return;

    try {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVEMENT',
          cashRegisterId: data.register.id,
          userId: user?.id || 'admin-id',
          type: movementType,
          amount: Number(movementAmount),
          reason: movementReason,
        }),
      });

      if (res.ok) {
        setShowMovementModal(false);
        setMovementAmount(0);
        setMovementReason('');
        loadRegister();
      } else {
        const err = await res.json();
        alert('Erro ao lançar movimentação: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isOpen = data?.active;
  const summary = data?.summary;
  const register = data?.register;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de Turnos de Caixa</h1>
          <p className="text-sm text-slate-500">Abertura de troco, sangria, suprimento e fechamento com conferência</p>
        </div>

        <div>
          {isOpen ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMovementType('SUPRIMENTO');
                  setShowMovementModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 border border-blue-200"
              >
                + Suprimento
              </button>
              <button
                onClick={() => {
                  setMovementType('SANGRIA');
                  setShowMovementModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs hover:bg-amber-100 border border-amber-200"
              >
                - Sangria
              </button>
              <button
                onClick={() => {
                  setReportedCash('');
                  setReportedCard('');
                  setReportedPix('');
                  setOperatorNotes('');
                  setShowCloseModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Fechamento às Cegas</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              Abrir Novo Turno de Caixa
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Caixa Pendente de Fechamento do Dia Anterior */}
      {summary?.isFromPreviousDay && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-5 text-rose-950 shadow-md space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 font-black text-sm text-rose-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>FECHAMENTO OBRIGATÓRIO: CAIXA PENDENTE DE DIA ANTERIOR</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed font-semibold">
            Este caixa foi aberto em <strong>{summary.openedDateFormatted} às {summary.openedTimeFormatted}</strong> e não foi encerrado no mesmo dia.
            Por regra de segurança comercial, <strong>um caixa não pode ficar aberto de um dia para o outro</strong>.
            É obrigatório realizar o fechamento deste turno antes de iniciar o movimento de vendas de hoje ou abrir um novo caixa.
          </p>
          <div className="pt-1">
            <button
              onClick={() => {
                setReportedCash('');
                setReportedCard('');
                setReportedPix('');
                setOperatorNotes('');
                setShowCloseModal(true);
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <EyeOff className="w-4 h-4" />
              <span>Realizar Fechamento às Cegas Deste Caixa Agora</span>
            </button>
          </div>
        </div>
      )}

      {!isOpen ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Nenhum Caixa Aberto no Momento</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Para registrar vendas no balcão e movimentar o financeiro, é necessário abrir um novo turno de caixa com valor de troco inicial.
            </p>
          </div>
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 shadow-lg"
          >
            Abrir Caixa Agora
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cartões de Status do Caixa Aberto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fundo Inicial (Troco)</span>
              <p className="text-2xl font-black text-slate-800 mt-2">{formatCurrency(summary?.initialAmount)}</p>
              <p className="text-xs text-slate-400 mt-1">Aberto às {new Date(register.openedAt).toLocaleTimeString('pt-BR')}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas em Dinheiro</span>
              <p className="text-2xl font-black text-emerald-600 mt-2">{formatCurrency(summary?.totalCashSales)}</p>
              <p className="text-xs text-slate-400 mt-1">Total geral: {formatCurrency(summary?.totalSales)}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cartão & PIX</span>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {formatCurrency((summary?.totalCardSales || 0) + (summary?.totalPixSales || 0))}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Cartão: {formatCurrency(summary?.totalCardSales)} | PIX: {formatCurrency(summary?.totalPixSales)}
              </p>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Saldo na Gaveta (Dinheiro)</span>
              <p className="text-3xl font-black text-emerald-400 mt-2">
                {formatCurrency(summary?.expectedCashInDrawer)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Suprimento: +{formatCurrency(summary?.totalSuprimento)} | Sangria: -{formatCurrency(summary?.totalSangria)}
              </p>
            </div>
          </div>

          {/* Histórico de Movimentações deste Turno */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Movimentações Avulsas do Caixa Atual</h3>
            {register?.movements?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma sangria ou suprimento lançado neste turno.</p>
            ) : (
              <div className="space-y-2">
                {register?.movements?.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`p-1.5 rounded-lg font-bold text-[10px] ${
                          m.type === 'SUPRIMENTO' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.type}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{m.reason}</p>
                        <p className="text-[10px] text-slate-400">Por {m.user?.name} às {new Date(m.createdAt).toLocaleTimeString('pt-BR')}</p>
                      </div>
                    </div>
                    <span className={`font-black text-sm ${m.type === 'SUPRIMENTO' ? 'text-blue-600' : 'text-amber-600'}`}>
                      {m.type === 'SUPRIMENTO' ? '+' : '-'} {formatCurrency(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE ABERTURA DE CAIXA */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800">Abrir Turno de Caixa</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenRegister} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fundo de Troco Inicial (R$)</label>
                <input
                  type="number"
                  step="1.00"
                  min="0"
                  required
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-lg text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white shadow"
                >
                  Abrir Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SUPRIMENTO / SANGRIA */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800">
                {movementType === 'SUPRIMENTO' ? 'Lançar Suprimento (Entrada)' : 'Lançar Sangria (Retirada)'}
              </h3>
              <button onClick={() => setShowMovementModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  min="0.50"
                  required
                  value={movementAmount || ''}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motivo / Descrição</label>
                <input
                  type="text"
                  required
                  placeholder={movementType === 'SUPRIMENTO' ? 'Ex: Troco adicional' : 'Ex: Recolhimento para cofre'}
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white shadow"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FECHAMENTO DE CAIXA ÀS CEGAS */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-fadeIn my-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Fechamento de Caixa às Cegas</h3>
                  <p className="text-[11px] text-slate-400">Conferência obrigatória sem exposição de valores prévios</p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Auditoria & Segurança às Cegas</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Por política de controle comercial, os valores calculados pelo sistema permanecem ocultos.
                O operador deve declarar a soma física apurada na gaveta e os comprovantes de pagamento.
                Ao confirmar, o comprovante oficial com as eventuais <strong>sobras ou faltas</strong> será emitido para validação da gerência.
              </p>
            </div>

            <form onSubmit={handleCloseRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Dinheiro Físico em Espécie na Gaveta (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0,00"
                  value={reportedCash}
                  onChange={(e) => setReportedCash(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-300 font-black text-lg text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Soma de todas as notas e moedas contadas na gaveta</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    2. Comprovantes de Cartão (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={reportedCard}
                    onChange={(e) => setReportedCard(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Débito + Crédito (tickets maquininha)</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    3. Comprovantes de PIX (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={reportedPix}
                    onChange={(e) => setReportedPix(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Comprovantes físicos ou tela do banco</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
                  4. Observações / Justificativas do Turno (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Deixado R$ 50,00 em moedas para o próximo turno..."
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClose}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-400 text-white rounded-xl font-black shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>{isSubmittingClose ? 'Encerrando...' : 'Concluir Fechamento às Cegas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE COMPROVANTE DE FECHAMENTO (CONFERÊNCIA GERENCIAL / IMPRESSÃO) */}
      {showVoucherModal && closingAuditData && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-fadeIn my-auto">
            {/* Header com botões de ação na tela */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Comprovante de Fechamento de Caixa</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Comprovante</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ÁREA IMPRIMÍVEL DO COMPROVANTE */}
            <div id="printableClosingVoucher" className="space-y-4 text-xs font-mono text-slate-800 p-2 sm:p-4 border rounded-2xl bg-slate-50/50 print:bg-white print:border-none print:p-0">
              {/* Topo do Comprovante */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <p className="text-base font-black tracking-wider uppercase font-sans">Web-Gescom</p>
                <p className="text-[11px] font-bold text-slate-600 uppercase">Comprovante de Fechamento de Caixa</p>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800 font-sans">
                  CONFERÊNCIA GERENCIAL ÀS CEGAS
                </span>
              </div>

              {/* Dados do Turno */}
              <div className="space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Operador:</span>
                  <span className="font-bold text-slate-800">{closingAuditData.operatorName} (@{closingAuditData.operatorUsername})</span>
                </div>
                <div className="flex justify-between">
                  <span>Abertura:</span>
                  <span className="font-bold text-slate-800">{new Date(closingAuditData.openedAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fechamento:</span>
                  <span className="font-bold text-slate-800">{new Date(closingAuditData.closedAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Fundo Troco Inicial:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(closingAuditData.initialAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total de Vendas ({closingAuditData.totalSalesCount}):</span>
                  <span className="font-bold text-slate-800">{formatCurrency(closingAuditData.totalSalesAmount)}</span>
                </div>
                {(closingAuditData.suprimento > 0 || closingAuditData.sangria > 0) && (
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Suprimentos: {formatCurrency(closingAuditData.suprimento)}</span>
                    <span>Sangrias: {formatCurrency(closingAuditData.sangria)}</span>
                  </div>
                )}
              </div>

              {/* Tabela de Conferência às Cegas */}
              <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-300">
                <p className="font-bold text-slate-800 text-[11px] uppercase font-sans">Apuração de Valores Declarados x Sistema:</p>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b">
                      <tr>
                        <th className="p-2">Forma</th>
                        <th className="p-2 text-right">Informado</th>
                        <th className="p-2 text-right">Apurado</th>
                        <th className="p-2 text-right">Diferença</th>
                        <th className="p-2 text-center">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2 font-bold">1. Dinheiro</td>
                        <td className="p-2 text-right">{formatCurrency(closingAuditData.cash.reported)}</td>
                        <td className="p-2 text-right">{formatCurrency(closingAuditData.cash.expected)}</td>
                        <td className="p-2 text-right font-bold">
                          {closingAuditData.cash.diff > 0 ? `+${formatCurrency(closingAuditData.cash.diff)}` : formatCurrency(closingAuditData.cash.diff)}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            closingAuditData.cash.status === 'SOBRA'
                              ? 'bg-blue-100 text-blue-700'
                              : closingAuditData.cash.status === 'FALTA'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {closingAuditData.cash.status}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-bold">2. Cartões</td>
                        <td className="p-2 text-right">{formatCurrency(closingAuditData.card.reported)}</td>
                        <td className="p-2 text-right">{formatCurrency(closingAuditData.card.expected)}</td>
                        <td className="p-2 text-right font-bold">
                          {closingAuditData.card.diff > 0 ? `+${formatCurrency(closingAuditData.card.diff)}` : formatCurrency(closingAuditData.card.diff)}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            closingAuditData.card.status === 'SOBRA'
                              ? 'bg-blue-100 text-blue-700'
                              : closingAuditData.card.status === 'FALTA'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {closingAuditData.card.status}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-bold">3. PIX</td>
                        <td className="p-2 text-right">{formatCurrency(closingAuditData.pix.reported)}</td>
                        <td className="p-2 text-right">{formatCurrency(closingAuditData.pix.expected)}</td>
                        <td className="p-2 text-right font-bold">
                          {closingAuditData.pix.diff > 0 ? `+${formatCurrency(closingAuditData.pix.diff)}` : formatCurrency(closingAuditData.pix.diff)}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            closingAuditData.pix.status === 'SOBRA'
                              ? 'bg-blue-100 text-blue-700'
                              : closingAuditData.pix.status === 'FALTA'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {closingAuditData.pix.status}
                          </span>
                        </td>
                      </tr>

                      <tr className="bg-slate-50 font-bold text-xs">
                        <td className="p-2 uppercase font-black">TOTAL GERAL</td>
                        <td className="p-2 text-right font-black">{formatCurrency(closingAuditData.total.reported)}</td>
                        <td className="p-2 text-right font-black">{formatCurrency(closingAuditData.total.expected)}</td>
                        <td className="p-2 text-right font-black">
                          {closingAuditData.total.diff > 0 ? `+${formatCurrency(closingAuditData.total.diff)}` : formatCurrency(closingAuditData.total.diff)}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            closingAuditData.total.status === 'SOBRA'
                              ? 'bg-blue-600 text-white'
                              : closingAuditData.total.status === 'FALTA'
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-700 text-white'
                          }`}>
                            {closingAuditData.total.status}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-xl text-xs font-bold font-sans ${
                closingAuditData.total.status === 'SOBRA'
                  ? 'bg-blue-50 border border-blue-200 text-blue-900'
                  : closingAuditData.total.status === 'FALTA'
                  ? 'bg-rose-50 border border-rose-300 text-rose-900'
                  : 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              }`}>
                {closingAuditData.total.status === 'CORRETO' && (
                  <p>✅ CAIXA 100% CORRETO: Os valores declarados conferem perfeitamente com os registros do sistema.</p>
                )}
                {closingAuditData.total.status === 'SOBRA' && (
                  <p>ℹ️ SOBRA DE CAIXA: O operador informou <strong>+{formatCurrency(closingAuditData.total.diff)}</strong> a mais que o apurado pelo sistema.</p>
                )}
                {closingAuditData.total.status === 'FALTA' && (
                  <p>⚠️ FALTA DE CAIXA: Identificada falta de <strong>{formatCurrency(Math.abs(closingAuditData.total.diff))}</strong> em relação ao apurado pelo sistema.</p>
                )}
              </div>

              {closingAuditData.operatorNotes && (
                <div className="p-2 bg-slate-100 rounded-lg text-[11px] text-slate-700">
                  <span className="font-bold block">Justificativa / Obs:</span>
                  <span>{closingAuditData.operatorNotes}</span>
                </div>
              )}

              {/* Linhas para Assinatura */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px] font-sans">
                <div className="space-y-1">
                  <div className="border-t border-slate-400 pt-1"></div>
                  <p className="font-bold text-slate-800">{closingAuditData.operatorName}</p>
                  <p className="text-slate-500">Operador de Caixa</p>
                </div>

                <div className="space-y-1">
                  <div className="border-t border-slate-400 pt-1"></div>
                  <p className="font-bold text-slate-800">Conferido por</p>
                  <p className="text-slate-500">Gerente / Administrador</p>
                </div>
              </div>
            </div>

            {/* Botão de Fechar Modal */}
            <div className="pt-2 flex justify-end print:hidden">
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Concluir & Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

