import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DocumentItem, BulkLot, AuthorizationItem, AuditLog } from '../types';
import {
  X,
  FileText,
  Building,
  User,
  Calendar,
  Layers,
  ShieldCheck,
  History,
  Printer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  documentId: number;
  onClose: () => void;
  onStatusChangeRequested?: (doc: DocumentItem) => void;
}

export const DocumentDetailModal: React.FC<Props> = ({ documentId, onClose, onStatusChangeRequested }) => {
  const [data, setData] = useState<{
    document: DocumentItem;
    recipients: any[];
    auditLogs: AuditLog[];
    lot: BulkLot | null;
    authorization: AuthorizationItem | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getDocumentDetail(documentId)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [documentId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
        <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Cargando detalles del documento...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-base">Error al cargar</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">{error || 'No se pudo obtener el documento'}</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const { document: doc, recipients, auditLogs, lot, authorization } = data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRADO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ENVIADO':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'RECIBIDO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ATENDIDO':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'OBSERVADO':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ANULADO':
      case 'CANCELADO':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">{doc.doc_type}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(doc.status)}`}>
                  {doc.status}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">N° {doc.formatted_number}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition"
              title="Imprimir Ficha"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto">
          {/* Main Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-600 block font-medium">Fecha del Documento:</span>
                <span className="font-semibold text-slate-900">{doc.date}</span>
              </div>
              <div>
                <span className="text-slate-600 block font-medium">Año / Correlativo:</span>
                <span className="font-semibold text-slate-900">
                  {doc.year} / {doc.number.toString().padStart(4, '0')}
                </span>
              </div>
              <div>
                <span className="text-slate-600 block font-medium">Registrado por:</span>
                <span className="font-semibold text-slate-900">{doc.user_name}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <span className="text-xs text-slate-600 block font-medium">Asunto:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{doc.subject}</p>
            </div>

            {doc.description && (
              <div className="border-t border-slate-200 pt-3">
                <span className="text-xs text-slate-600 block font-medium">Descripción / Contenido:</span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap mt-0.5 leading-relaxed">{doc.description}</p>
              </div>
            )}

            {doc.observations && (
              <div className="border-t border-slate-200 pt-3">
                <span className="text-xs text-amber-700 block font-medium">Observaciones:</span>
                <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 mt-0.5">
                  {doc.observations}
                </p>
              </div>
            )}

            {doc.variable_data && (
              <div className="border-t border-slate-200 pt-3">
                <span className="text-xs text-blue-700 block font-medium">Datos Variables Específicos:</span>
                <div className="bg-blue-50 p-2.5 rounded border border-blue-200 text-xs text-blue-900 mt-1">
                  <pre className="font-mono text-[11px] whitespace-pre-wrap">
                    {JSON.stringify(JSON.parse(doc.variable_data), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Destinatarios */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              Destinatario{recipients.length > 1 ? 's (Oficio Múltiple)' : ''} ({recipients.length})
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {recipients.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      {rec.recipient_name}
                      {rec.recipient_acronym && (
                        <span className="ml-1.5 text-xs text-blue-600 font-medium">({rec.recipient_acronym})</span>
                      )}
                    </span>
                    <span className="text-slate-600 block mt-0.5">
                      <strong className="text-slate-700">Responsable:</strong> {rec.boss_name} —{' '}
                      <span className="italic text-slate-600">{rec.boss_position}</span>
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-center font-medium">
                    Destino #{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lote Masivo y Autorización (if applicable) */}
          {(lot || authorization) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lot && (
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 text-xs space-y-1.5">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Generación Masiva
                  </h4>
                  <div>
                    <span className="text-slate-600">Código de Lote:</span>{' '}
                    <strong className="text-slate-900 font-mono">{lot.code}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Total en Lote:</span>{' '}
                    <span className="font-medium text-slate-900">{lot.quantity} documentos</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Operación:</span>{' '}
                    <span className="font-medium text-slate-900">{lot.operation_type}</span>
                  </div>
                </div>
              )}

              {authorization && (
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 text-xs space-y-1.5">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Autorización Administrativa
                  </h4>
                  <div>
                    <span className="text-slate-600">Código:</span>{' '}
                    <strong className="text-slate-900 font-mono">{authorization.code}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Área Autorizadora:</span>{' '}
                    <span className="font-medium text-slate-900">{authorization.authorizing_area}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Responsable:</span>{' '}
                    <span className="font-medium text-slate-900">{authorization.authorizing_boss}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit History for this Document */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-600" />
              Trazabilidad e Historial de Auditoría ({auditLogs.length})
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
              {auditLogs.length === 0 ? (
                <div className="p-3 text-slate-600 text-center">No hay registros de auditoría asociados.</div>
              ) : (
                auditLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-white hover:bg-slate-50 transition flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-600">por {log.user_name}</span>
                      </div>
                      {log.reason && <p className="text-slate-600 text-[11px] italic">{log.reason}</p>}
                    </div>
                    <span className="text-[10px] text-slate-600 font-mono shrink-0">
                      {new Date(log.created_at).toLocaleString('es-PE')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <div>
            {onStatusChangeRequested && doc.status !== 'ANULADO' && doc.status !== 'CANCELADO' && (
              <button
                onClick={() => onStatusChangeRequested(doc)}
                className="text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md transition"
              >
                Cambiar Estado / Anular
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
