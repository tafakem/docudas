import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  UserCog,
  Plus,
  Shield,
  Clock,
  Edit,
  Power,
  X,
  Lock,
  Mail,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'USUARIO' as UserRole
  });

  // Edit Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'USUARIO' as UserRole,
    status: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
    password: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    api
      .getUsers()
      .then(res => {
        setUsers(res.users);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createUser(createForm);
      setIsCreating(false);
      setCreateForm({ username: '', name: '', email: '', password: '', role: 'USUARIO' });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al crear usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      password: ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await api.updateUser(editingUser.id, editForm);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar usuario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="w-5 h-5 text-blue-600" />
            Gestión de Usuarios y Roles de Acceso
          </h2>
          <p className="text-xs text-slate-500">
            Control de cuentas, asignación de perfiles (Administrador / Usuario) y auditoría de accesos.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Nombre Completo</th>
                <th className="px-3 py-3">Usuario</th>
                <th className="px-4 py-3">Correo Institucional</th>
                <th className="px-3 py-3 text-center">Rol de Sistema</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3">Último Acceso</th>
                <th className="px-3 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{u.name}</td>
                    <td className="px-3 py-3.5 font-mono text-slate-800 font-medium">{u.username}</td>
                    <td className="px-4 py-3.5 text-slate-600">{u.email}</td>
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                          u.role === 'ADMINISTRADOR'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          u.status === 'ACTIVO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500 font-mono text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es-PE') : 'Sin registros'}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Modificar Usuario"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Crear Nuevo Usuario</h3>
              <button onClick={() => setIsCreating(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre y Apellidos:</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ej: Lic. Elena Morales Castro"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre de Usuario (login):</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={e => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().trim() })}
                  placeholder="emorales"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value.trim() })}
                  placeholder="emorales@oficina.gob"
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contraseña Inicial:</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rol de Permisos:</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white font-medium"
                >
                  <option value="USUARIO">USUARIO — Operador de registro de documentos</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR — Control total del sistema</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {submitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Modificar Usuario: {editingUser.username}</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rol:</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="USUARIO">USUARIO</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado:</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reestablecer Contraseña (opcional):
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Dejar en blanco para conservar actual"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {submitting ? 'Guardando...' : 'Actualizar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
