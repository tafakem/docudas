import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './pages/LoginView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './pages/DashboardView';
import { DocumentsView } from './pages/DocumentsView';
import { RegisterDocumentView } from './pages/RegisterDocumentView';
import { BulkRegisterView } from './pages/BulkRegisterView';
import { BulkLotsView } from './pages/BulkLotsView';
import { RecipientsView } from './pages/RecipientsView';
import { NumberingControlView } from './pages/NumberingControlView';
import { AuthorizationsView } from './pages/AuthorizationsView';
import { UsersView } from './pages/UsersView';
import { AuditView } from './pages/AuditView';
import { ProfileView } from './pages/ProfileView';
import { BackupView } from './pages/BackupView';

export default function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="animate-spin w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full mb-4" />
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
          Inicializando Sistema de Control Documental...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Panel Principal (Dashboard)';
      case 'documents':
        return 'Control de Documentos';
      case 'register':
        return 'Registrar Nuevo Documento';
      case 'bulk-register':
        return 'Registro Masivo de Memorándums';
      case 'bulk-lots':
        return 'Historial de Lotes Masivos';
      case 'recipients':
        return 'Directorio de Destinatarios';
      case 'numbering':
        return 'Control Centralizado de Numeración';
      case 'authorizations':
        return 'Autorizaciones Administrativas';
      case 'backup':
        return 'Respaldo y Restauración de Datos';
      case 'users':
        return 'Gestión de Usuarios y Permisos';
      case 'audit':
        return 'Auditoría y Trazabilidad General';
      case 'profile':
        return 'Mi Perfil de Usuario';
      default:
        return 'Sistema de Control Documental';
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentView} />;
      case 'documents':
        return <DocumentsView />;
      case 'register':
        return <RegisterDocumentView onSuccessNavigate={setCurrentView} />;
      case 'bulk-register':
        return <BulkRegisterView onSuccessNavigate={setCurrentView} />;
      case 'bulk-lots':
        return <BulkLotsView />;
      case 'recipients':
        return <RecipientsView />;
      case 'numbering':
        return <NumberingControlView />;
      case 'authorizations':
        return <AuthorizationsView />;
      case 'backup':
        return <BackupView />;
      case 'users':
        return <UsersView />;
      case 'audit':
        return <AuditView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      <Header
        activeViewTitle={getViewTitle()}
        onOpenProfile={() => setCurrentView('profile')}
        onNavigate={setCurrentView}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex flex-1">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-x-hidden min-w-0 bg-slate-100 p-2 sm:p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
