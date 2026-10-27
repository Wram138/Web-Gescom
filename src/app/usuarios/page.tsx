'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Plus,
  Shield,
  Edit2,
  CheckCircle,
  XCircle,
  X,
  Lock,
  Percent,
  Settings,
  CheckSquare,
  Square,
  ShieldAlert,
} from 'lucide-react';

export default function UsuariosPage() {
  const { user, reloadPermissions } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Estados de Permissões por Perfil
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [allModulesList, setAllModulesList] = useState<any[]>([]);
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>({});
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<string>('CAIXA');
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'VENDEDOR',
    commissionRate: 5.0,
    monthlyGoal: 0.0,
    active: true,
  });

  useEffect(() => {
    loadUsers();
    loadPermissionsData();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissionsData = async () => {
    try {
      const res = await fetch('/api/permissions');
      if (res.ok) {
        const data = await res.json();
        setRolePermissionsMap(data.permissions || {});
        setAllModulesList(data.allModules || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenNew = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'VENDEDOR',
      commissionRate: 5.0,
      monthlyGoal: 0.0,
      active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      password: '', // Deixa vazio a menos que queira alterar
      role: u.role,
      commissionRate: u.commissionRate,
      monthlyGoal: u.monthlyGoal || 0.0,
      active: u.active,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const payload = editingUser ? { id: editingUser.id, ...formData } : formData;

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        loadUsers();
      } else {
        const err = await res.json();
        alert('Erro ao salvar usuário: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleModulePermission = (moduleId: string) => {
    const current = rolePermissionsMap[selectedRoleForPerms] || [];
    let updated: string[];
    if (current.includes(moduleId)) {
      updated = current.filter((m) => m !== moduleId);
    } else {
      updated = [...current, moduleId];
    }

    setRolePermissionsMap((prev) => ({
      ...prev,
      [selectedRoleForPerms]: updated,
    }));
  };

  const selectAllModules = () => {
    const allIds = allModulesList.map((m) => m.id);
    setRolePermissionsMap((prev) => ({
      ...prev,
      [selectedRoleForPerms]: allIds,
    }));
  };

  const deselectAllModules = () => {
    setRolePermissionsMap((prev) => ({
      ...prev,
      [selectedRoleForPerms]: [],
    }));
  };

  const handleSaveRolePermissions = async () => {
    setIsSavingPerms(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRoleForPerms,
          modules: rolePermissionsMap[selectedRoleForPerms] || [],
          requestUserRole: user?.role,
        }),
      });

      if (res.ok) {
        await reloadPermissions();
        alert(`Permissões do perfil ${selectedRoleForPerms} atualizadas com sucesso!`);
        setShowPermissionsModal(false);
      } else {
        const err = await res.json();
        alert('Erro ao salvar permissões: ' + err.error);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSavingPerms(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de Usuários & Perfis</h1>
          <p className="text-sm text-slate-500">
            Administre operadores, gerentes, vendedores e configure os acessos de cada perfil
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              title="Configurar permissões de acesso por perfil"
            >
              <Settings className="w-4 h-4" />
              <span>Permissões por Perfil</span>
            </button>
          )}

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Cadastrar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Nome do Usuário</th>
                <th className="py-3.5 px-4">Login / Username</th>
                <th className="py-3.5 px-4">Perfil / Cargo</th>
                {isManagerOrAdmin && <th className="py-3.5 px-4 text-center">Taxa de Comissão</th>}
                {isManagerOrAdmin && <th className="py-3.5 px-4 text-center">Meta Mensal</th>}
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isManagerOrAdmin ? 7 : 5} className="text-center py-10 text-slate-400">
                    Carregando usuários...
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-600">
                    @{u.username}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : u.role === 'GERENTE'
                          ? 'bg-blue-100 text-blue-700'
                          : u.role === 'CAIXA'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  {isManagerOrAdmin && (
                    <td className="py-3 px-4 text-center font-bold text-slate-700 text-xs">
                      {u.role === 'VENDEDOR' ? `${u.commissionRate}%` : '—'}
                    </td>
                  )}
                  {isManagerOrAdmin && (
                    <td className="py-3 px-4 text-center text-xs">
                      {u.role === 'VENDEDOR' ? (
                        u.monthlyGoal > 0 ? (
                          <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(u.monthlyGoal)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Sem meta</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        u.active ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {u.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar Usuário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE USUÁRIO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome de Usuário (Login) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: joao.vendas"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Defina a senha'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className={`grid ${isManagerOrAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Perfil / Cargo</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="CAIXA">Operador de Caixa</option>
                    <option value="VENDEDOR">Vendedor</option>
                  </select>
                </div>

                {isManagerOrAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Comissão Padrão %</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    />
                  </div>
                )}
              </div>

              {isManagerOrAdmin && formData.role === 'VENDEDOR' && (
                <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
                  <label className="block text-xs font-bold text-amber-900">
                    🎯 Meta Mensal de Vendas (R$)
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    placeholder="Ex: 10000.00"
                    value={formData.monthlyGoal}
                    onChange={(e) => setFormData({ ...formData, monthlyGoal: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-bold text-amber-900"
                  />
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Ao atingir esta meta no mês, a comissão do vendedor é <b>automaticamente dobrada (2x)</b> em todas as vendas!
                  </p>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-700">Usuário Ativo (Pode logar no sistema)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white shadow"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DO ADMINISTRADOR: PERMISSÕES DE ACESSO POR PERFIL */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Shield className="w-6 h-6" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Permissões de Acesso por Perfil</h3>
                  <p className="text-xs text-slate-500">
                    Defina quais módulos cada perfil pode acessar. Módulos desmarcados não serão exibidos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seletor de Perfil */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Selecione o Perfil para Configurar:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['GERENTE', 'CAIXA', 'VENDEDOR'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoleForPerms(r)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      selectedRoleForPerms === r
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex justify-between items-center text-xs pt-2">
              <span className="font-semibold text-slate-600">
                Módulos Permitidos para <strong>{selectedRoleForPerms}</strong>:
              </span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={selectAllModules}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Marcar Todos
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={deselectAllModules}
                  className="text-rose-600 hover:underline font-bold"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            {/* Lista de Módulos com Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
              {allModulesList.map((mod) => {
                const currentPerms = rolePermissionsMap[selectedRoleForPerms] || [];
                const isChecked = currentPerms.includes(mod.id);

                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModulePermission(mod.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs leading-tight">{mod.label}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{mod.path}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="flex-1 py-2.5 border rounded-xl font-bold text-slate-700 text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRolePermissions}
                disabled={isSavingPerms}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isSavingPerms ? 'Salvando...' : `Salvar Permissões de ${selectedRoleForPerms}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
