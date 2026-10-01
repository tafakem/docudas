import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FilePlus2,
  Layers,
  History,
  Users2,
  Hash,
  ShieldCheck,
  UserCog,
  FileSearch,
  BookOpenCheck,
  Database,
  X
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const { isAdmin } = useAuth();

  const sections = [
    {
      title: 'CONTROL DE DOCUMENTOS',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'documents', label: 'Control de Documentos', icon: FileSpreadsheet },
        { id: 'register', label: 'Registrar Documento', icon: FilePlus2 },
        { id: 'bulk-register', label: 'Registro Masivo', icon: Layers },
        { id: 'bulk-lots', label: 'Historial de Lotes', icon: History }
      ]
    },
    {
      title: 'CONFIGURACIÓN Y RESPALDO',
      items: [
        { id: 'recipients', label: 'Destinatarios', icon: Users2 },
        { id: 'numbering', label: 'Control de Numeración', icon: Hash },
        { id: 'authorizations', label: 'Autorizaciones', icon: ShieldCheck },
        { id: 'backup', label: 'Respaldo de Datos', icon: Database }
      ]
    },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        { id: 'users', label: 'Usuarios y Roles', icon: UserCog, adminOnly: true },
        { id: 'audit', label: 'Auditoría General', icon: FileSearch }
      ]
    }
  ];

  const handleSelect = (id: string) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="p-4 flex-1 space-y-6 overflow-y-auto">
      {sections.map((section, idx) => {
        const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
        if (visibleItems.length === 0) return null;

        return (
          <div key={idx} className="space-y-1.5">
            <h2 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase px-3">
              {section.title}
            </h2>
            <div className="space-y-0.5">
              {visibleItems.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition text-left cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-[11px] text-slate-400 mt-4">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
          <BookOpenCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Gestión Multiplataforma</span>
        </div>
        <p className="leading-tight text-slate-400">
          Acceda en tablets, móviles y PC con respaldos automáticos y numeración concurrente.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex-col shrink-0 min-h-[calc(100vh-61px)] select-none">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          <div className="relative flex-1 max-w-xs w-full bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col z-50 h-full shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm text-white">MENÚ DE NAVEGACIÓN</span>
              <button
                onClick={onCloseMobile}
                className="p-1 text-slate-400 hover:text-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
