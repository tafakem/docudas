import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { api } from '../services/api';
import { AuthorizationItem } from '../types';
import { Shield, User, LogOut, FileText, Calendar, Menu, Database, Bell, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface HeaderProps {
  activeViewTitle: string;
  onOpenProfile: () => void;
  onNavigate: (view: string) => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeViewTitle,
  onOpenProfile,
  onNavigate,
  onToggleSidebar
}) => {
  const { user, logout, isAdmin } = useAuth();
  const currentYear = new Date().getFullYear();
  const todayFormatted = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  // Notification state for pending authorizations
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingList, setPendingList] = useState<AuthorizationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const fetchPendingAuthorizations = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.getPendingAuthorizationsCount();
      setPendingCount(res.pendingCount);
      setPendingList(res.pendingList);
    } catch {
      // ignore silent errors
    }
  };

  useEffect(() => {
    fetchPendingAuthorizations();
    const interval = setInterval(fetchPendingAuthorizations, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleApproveQuick = async (id: number) => {
    try {
      await api.approveAuthorization(id);
      fetchPendingAuthorizations();
    } catch (err: any) {
      alert(err.message || 'Error al aprobar');
    }
  };

  const handleRejectQuick = async (id: number) => {
    try {
      await api.rejectAuthorization(id, 'Rechazado desde notificación del encabezado');
      fetchPendingAuthorizations();
    } catch (err: any) {
      alert(err.message || 'Error al rechazar');
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Abrir Menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xs sm:text-sm md:text-base tracking-tight leading-none text-slate-100 flex items-center gap-1.5 sm:gap-2">
              <span className="truncate max-w-[180px] sm:max-w-none">CONTROL DOCUMENTAL</span>
              <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                {currentYear}
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 capitalize mt-0.5 hidden sm:flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              {todayFormatted}
            </p>
          </div>
        </div>

        <div className="hidden lg:block h-6 w-px bg-slate-700 mx-2" />

        <div className="hidden lg:flex items-center text-xs sm:text-sm text-slate-300 font-medium">
          <span>{activeViewTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA In-App Install Button */}
        <PWAInstallButton />

        {/* Notification Bell for Admin */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-lg border transition relative cursor-pointer ${
                pendingCount > 0
                  ? 'bg-rose-950/80 border-rose-600/80 text-rose-300 hover:bg-rose-900'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={pendingCount > 0 ? `${pendingCount} Solicitudes Masivas pendientes por aprobar` : 'Notificaciones'}
            >
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full animate-pulse border border-slate-900">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-900 z-50 p-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-rose-600" />
                    <h3 className="font-bold text-xs text-slate-900">Aprobaciones Masivas Pendientes</h3>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {pendingCount} requeridas
                  </span>
                </div>

                {pendingCount === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    ✓ No hay solicitudes de registro masivo pendientes de aprobación.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {pendingList.map(item => (
                      <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-mono text-blue-700">{item.code}</span>
                          <span className="text-[10px] text-slate-500">{item.date}</span>
                        </div>
                        <p className="font-semibold text-slate-800 line-clamp-1">{item.subject}</p>
                        <div className="text-[11px] text-slate-600 flex justify-between">
                          <span>Solicitante: <strong>{item.user_name}</strong></span>
                          <span>Cantidad: <strong className="text-indigo-700">{item.authorized_qty} MEM</strong></span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleRejectQuick(item.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleApproveQuick(item.id)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Aprobar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate('authorizations');
                  }}
                  className="w-full mt-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Ir al Módulo de Autorizaciones
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Respaldo Quick Button */}
        <button
          onClick={() => onNavigate('backup')}
          className="hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          title="Respaldo Automático y Manual"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden xl:inline">Respaldos</span>
        </button>

        {/* Quick action button */}
        <button
          onClick={() => onNavigate('register')}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Nuevo</span>
        </button>

        {/* User badge */}
        {user && (
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg pl-2.5 pr-1.5 py-1">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[120px]">{user.name}</div>
              <div className="text-[10px] flex items-center gap-1 justify-end text-slate-400">
                <Shield className="w-2.5 h-2.5 text-blue-400" />
                <span className={user.role === 'ADMINISTRADOR' ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenProfile}
              title="Mi Perfil"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition"
            >
              <User className="w-4 h-4" />
            </button>

            <button
              onClick={logout}
              title="Cerrar Sesión"
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-md transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
