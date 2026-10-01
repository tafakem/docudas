import React, { useState } from 'react';
import { DocumentItem, DocStatus } from '../types';
import { api } from '../services/api';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  document: DocumentItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const StatusChangeModal: React.FC<Props> = ({ document: doc, onClose, onSuccess }) => {
  const [status, setStatus] = useState<DocStatus>(doc.status);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statuses: { value: DocStatus; label: string; desc: string }[] = [
    { value: 'REGISTRADO', label: 'REGISTRADO', desc: 'Documento oficial emitido y archivado' },
    { value: 'ENVIADO', label: 'ENVIADO', desc: 'Despachado a la mesa de partes o área destino' },
    { value: 'RECIBIDO', label: 'RECIBIDO', desc: 'Confirmada la recepción por el destinatario' },
    { value: 'ATENDIDO', label: 'ATENDIDO', desc: 'Trámite finalizado satisfactoriamente' },
    { value: 'OBSERVADO', label: 'OBSERVADO', desc: 'Pendiente de subsanación o aclaración técnica' },
    { value: 'ANULADO', label: 'ANULADO', desc: 'Documento invalidado por error u orden superior' },
    { value: 'CANCELADO', label: 'CANCELADO', desc: 'Operación suspendida formalmente' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Es obligatorio indicar el motivo de la acción.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.changeDocumentStatus(doc.id, status, reason.trim());
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar estado');
      setLoading(false);
    }
  };

  const isAnnulling = status === 'ANULADO' || status === 'CANCELADO';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${isAnnulling ? 'text-rose-400' : 'text-amber-400'}`} />
            <div>
              <h3 className="font-bold text-sm text-white">Cambiar Estado de Documento</h3>
              <p className="text-xs text-slate-400 font-mono">N° {doc.formatted_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nuevo Estado:</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as DocStatus)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label} — {s.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Motivo / Justificación de la acción <span className="text-rose-500">*</span>:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Indique detalladamente el motivo del cambio o resolución que lo sustenta..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Rule #7 explicit notice */}
          {isAnnulling && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-tight">
                <strong>Regla de Trazabilidad Histórica:</strong> Al anular este documento, el número correlativo{' '}
                <span className="font-mono font-bold text-amber-950">{doc.formatted_number}</span> NO volverá a estar
                disponible ni se reutilizará. Queda archivado con estado ANULADO para preservar la auditoría.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-sm flex items-center gap-1.5 ${
                isAnnulling ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Procesando...' : isAnnulling ? 'Confirmar Anulación' : 'Actualizar Estado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
