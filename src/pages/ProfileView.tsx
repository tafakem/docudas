import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, Lock, Shield, Mail, Calendar, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword) {
      if (!currentPassword) {
        setErrorMessage('Debe ingresar su contraseña actual para establecer una nueva contraseña.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('La nueva contraseña y la confirmación no coinciden.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });

      setSuccessMessage(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      refreshUser();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar el perfil');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Mi Perfil de Usuario
        </h2>
        <p className="text-xs text-slate-500">
          Información de la cuenta activa, historial de acceso y cambio de clave personal.
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          {errorMessage}
        </div>
      )}

      {/* Account Info Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
            {user?.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">{user?.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="font-mono text-slate-700">@{user?.username}</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[10px]">
                {user?.role}
              </span>
            </div>
            {user?.lastLoginAt && (
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Último acceso registrado: {new Date(user.lastLoginAt).toLocaleString('es-PE')}
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nombre Completo:</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico:</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5"
              required
            />
          </div>

          {/* Change Password Block */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-600" />
              Cambio de Contraseña (Opcional):
            </h4>
            <p className="text-[11px] text-slate-500">
              Complete estos campos únicamente si desea actualizar su clave de acceso al sistema.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contraseña Actual:</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Ingrese su clave actual"
                className="w-full border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nueva Contraseña:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirmar Nueva Contraseña:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva clave"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-right">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios de Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
