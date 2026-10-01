import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AuthorizationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Plus,
  Send,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  Building,
  AlertCircle
} from 'lucide-react';

export const AuthorizationsView: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split('T')[0];

  const [authorizations, setAuthorizations] = useState<AuthorizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 'TODAS' | 'PENDIENTES'
  const [activeTab, setActiveTab] = useState<'TODAS' | 'PENDIENTES'>('TODAS');

  // Modal Request Authorization (for users/operators)
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestData, setRequestData] = useState({
    date: todayStr,
    operationType: 'PAGOS',
    subject: '',
    description: '',
    authorizingArea: 'Dirección General de Administración',
    authorizingBoss: 'Mg. Roberto Salazar Campos',
    requestedQty: '25'
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Modal Create Direct (for Admin)
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: `AUT-${currentYear}-`,
    date: todayStr,
    operationType: 'PAGOS',
    subject: '',
    description: '',
    authorizingArea: 'Dirección General de Administración',
    authorizingBoss: 'Mg. Roberto Salazar Campos',
    authorizedQty: '50'
  });
  const [submitting, setSubmitting] = useState(false);

  // Cancel modal
  const [cancelAuth, setCancelAuth] = useState<AuthorizationItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadData = () => {
    setLoading(true);
    api
      .getAuthorizations()
      .then(res => {
        setAuthorizations(res.authorizations);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      const res = await api.requestAuthorization(requestData);
      alert(res.message);
      setIsRequesting(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al enviar solicitud');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleSaveDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAuthorization(formData);
      setIsCreating(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar autorización');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (auth: AuthorizationItem) => {
    if (!window.confirm(`¿Aprobar solicitud ${auth.code} por ${auth.authorized_qty} memorándums?`)) return;
    try {
      const res = await api.approveAuthorization(auth.id);
      alert(res.message);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al aprobar solicitud');
    }
  };

  const handleReject = async (auth: AuthorizationItem) => {
    const reason = window.prompt(`Motivo de rechazo para ${auth.code}:`, 'No cumple con sustento administrativo');
    if (reason === null) return;
    try {
      const res = await api.rejectAuthorization(auth.id, reason);
      alert(res.message);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al rechazar solicitud');
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelAuth) return;
    setCancelling(true);
    try {
      await api.cancelAuthorization(cancelAuth.id, cancelReason);
      setCancelAuth(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar autorización');
    } finally {
      setCancelling(false);
    }
  };

  const pendingList = authorizations.filter(a => a.status === 'PENDIENTE');
  const displayedList =
    activeTab === 'PENDIENTES' ? pendingList : authorizations;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AUTORIZADA':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
      case 'UTILIZADA':
        return 'bg-slate-100 text-slate-700 border-slate-200 font-semibold';
      case 'PENDIENTE':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-bold animate-pulse';
      case 'CANCELADA':
        return 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Autorizaciones Administrativas Oficiales
          </h2>
          <p className="text-xs text-slate-500">
            Aprobación y control de cuotas para emisión masiva de memorándums con notificación al administrador.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Button for Users to Request Authorization */}
          <button
            onClick={() => setIsRequesting(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Solicitar Autorización Masiva
          </button>

          {/* Button for Admin Direct Creation */}
          {isAdmin && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nueva Autorización Directa
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('TODAS')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'TODAS'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todas las Autorizaciones ({authorizations.length})
        </button>

        <button
          onClick={() => setActiveTab('PENDIENTES')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'PENDIENTES'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Solicitudes Pendientes de Aprobación
          {pendingList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-extrabold ml-1">
              {pendingList.length}
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Solicitante / Operación</th>
                <th className="px-4 py-3">Asunto y Área Autorizadora</th>
                <th className="px-3 py-3 text-center">Cuota</th>
                <th className="px-3 py-3 text-center">Consumido</th>
                <th className="px-3 py-3 text-center">Disponible</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && displayedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Cargando autorizaciones...
                  </td>
                </tr>
              ) : displayedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No hay autorizaciones en esta categoría.
                  </td>
                </tr>
              ) : (
                displayedList.map(auth => (
                  <tr key={auth.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">{auth.code}</td>
                    <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">{auth.date}</td>
                    <td className="px-3 py-3.5">
                      <span className="font-bold text-slate-900 block">{auth.user_name}</span>
                      <span className="text-[11px] text-slate-500 font-semibold">{auth.operation_type}</span>
                    </td>
                    <td className="px-4 py-3.5 max-w-sm">
                      <span className="font-semibold text-slate-900 block truncate" title={auth.subject}>
                        {auth.subject}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {auth.authorizing_area} — {auth.authorizing_boss}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center font-bold text-slate-800">{auth.authorized_qty}</td>
                    <td className="px-3 py-3.5 text-center font-mono text-slate-600">{auth.used_qty}</td>
                    <td className="px-3 py-3.5 text-center font-mono font-bold text-emerald-700 text-sm">
                      {auth.available_qty}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${getStatusBadge(auth.status)}`}>
                        {auth.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                      {isAdmin && auth.status === 'PENDIENTE' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReject(auth)}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 cursor-pointer"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleApprove(auth)}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-xs cursor-pointer"
                          >
                            Aprobar
                          </button>
                        </div>
                      )}

                      {isAdmin && auth.status === 'AUTORIZADA' && (
                        <button
                          onClick={() => setCancelAuth(auth)}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal User Request Authorization */}
      {isRequesting && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Solicitar Autorización para Registro Masivo</h3>
              </div>
              <button onClick={() => setIsRequesting(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-tight text-[11px]">
                  Su solicitud se enviará en tiempo real al <strong>Administrador General</strong> con una notificación de alerta.
                  Una vez aprobada, podrá emitir el lote masivo.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de Operación:</label>
                  <input
                    type="date"
                    value={requestData.date}
                    onChange={e => setRequestData({ ...requestData, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cantidad de Documentos Solicitados:</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={requestData.requestedQty}
                    onChange={e => setRequestData({ ...requestData, requestedQty: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-indigo-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Operación:</label>
                  <select
                    value={requestData.operationType}
                    onChange={e => setRequestData({ ...requestData, operationType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white font-medium"
                  >
                    <option value="PAGOS">PAGOS Y HONORARIOS</option>
                    <option value="TRANSFERENCIAS">TRANSFERENCIAS</option>
                    <option value="SOLICITUDES">SOLICITUDES INSTITUCIONALES</option>
                    <option value="NOTIFICACIONES">NOTIFICACIONES MASIVAS</option>
                    <option value="OTROS">OTROS CONVENIOS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Área Autorizadora Competente:</label>
                  <input
                    type="text"
                    value={requestData.authorizingArea}
                    onChange={e => setRequestData({ ...requestData, authorizingArea: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jefe / Director que Aprueba Sustento:</label>
                <input
                  type="text"
                  value={requestData.authorizingBoss}
                  onChange={e => setRequestData({ ...requestData, authorizingBoss: e.target.value })}
                  placeholder="Ej: Mg. Roberto Salazar Campos"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asunto / Motivo del Lote Masivo:</label>
                <input
                  type="text"
                  value={requestData.subject}
                  onChange={e => setRequestData({ ...requestData, subject: e.target.value })}
                  placeholder="Ej: Pago de retribuciones de orden de servicio de locadores"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción / Documento de Sustento:</label>
                <textarea
                  rows={2}
                  value={requestData.description}
                  onChange={e => setRequestData({ ...requestData, description: e.target.value })}
                  placeholder="Resolución Directoral o informe previo de sustento..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRequesting(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingRequest ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create Direct Authorization (Admin) */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Nueva Autorización Directa (Administrador)</h3>
              <button onClick={() => setIsCreating(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDirect} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código de Autorización:</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder={`AUT-${currentYear}-0003`}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Operación:</label>
                  <select
                    value={formData.operationType}
                    onChange={e => setFormData({ ...formData, operationType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="PAGOS">PAGOS</option>
                    <option value="TRANSFERENCIAS">TRANSFERENCIAS</option>
                    <option value="SOLICITUDES">SOLICITUDES</option>
                    <option value="NOTIFICACIONES">NOTIFICACIONES</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cantidad Autorizada:</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.authorizedQty}
                    onChange={e => setFormData({ ...formData, authorizedQty: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Área que Autoriza:</label>
                <input
                  type="text"
                  value={formData.authorizingArea}
                  onChange={e => setFormData({ ...formData, authorizingArea: e.target.value })}
                  placeholder="Ej: Dirección General de Administración"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Funcionario Responsable:</label>
                <input
                  type="text"
                  value={formData.authorizingBoss}
                  onChange={e => setFormData({ ...formData, authorizingBoss: e.target.value })}
                  placeholder="Ej: Mg. Roberto Salazar Campos"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asunto / Objeto:</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ej: Autorización para trámite de pagos de locadores de servicios"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción / Sustento:</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles complementarios..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  {submitting ? 'Guardando...' : 'Crear Autorización Directa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cancel Authorization */}
      {cancelAuth && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-1">Cancelar Autorización Administrativa</h3>
            <p className="text-xs text-slate-600 mb-4">
              ¿Está seguro de cancelar la autorización <strong>{cancelAuth.code}</strong>?
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo de la cancelación:</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Ej: Anulación por nueva resolución rectoral..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelAuth(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                >
                  {cancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
