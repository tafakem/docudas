import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Ingrese su usuario y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(username.trim(), password.trim());
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleSelectPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/10 border border-blue-400/20">
            <FileText className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SISTEMA DE CONTROL DOCUMENTAL</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Módulo institucional de control, registro, numeración centralizada y auditoría oficial
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Usuario del Sistema:</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña de Acceso:</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                'Verificando credenciales...'
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick User Presets for testing */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
              Cuentas configuradas para acceso:
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleSelectPreset('admin', 'admin123')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">admin</div>
                  <div className="text-[10px] text-slate-500">Clave: admin123</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold">
                  ADMINISTRADOR
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('operador', 'operador123')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">operador</div>
                  <div className="text-[10px] text-slate-500">Clave: operador123</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/80 font-bold">
                  USUARIO OPERADOR
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-[11px] text-slate-500">
          Control de acceso seguro • Hash bcrypt • Sesión cifrada JWT
        </div>
      </div>
    </div>
  );
};
