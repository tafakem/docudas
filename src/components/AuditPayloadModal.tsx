import React from 'react';
import { AuditLog } from '../types';
import { X, FileSearch } from 'lucide-react';

interface Props {
  log: AuditLog;
  onClose: () => void;
}

export const AuditPayloadModal: React.FC<Props> = ({ log, onClose }) => {
  const parseJson = (str?: string) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  const oldData = parseJson(log.old_values);
  const newData = parseJson(log.new_values);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Detalle de Registro de Auditoría</h3>
              <p className="text-xs text-slate-400">ID #{log.id} — {log.action}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-600 block">Usuario:</span>
              <strong className="text-slate-900">{log.user_name}</strong>
            </div>
            <div>
              <span className="text-slate-600 block">Fecha y Hora:</span>
              <span className="font-mono text-slate-800">{new Date(log.created_at).toLocaleString('es-PE')}</span>
            </div>
            <div>
              <span className="text-slate-600 block">Entidad:</span>
              <span className="font-medium text-slate-900">{log.entity_type}</span>
            </div>
            <div>
              <span className="text-slate-600 block">IP Registrada:</span>
              <span className="font-mono text-slate-700">{log.ip_address || '127.0.0.1'}</span>
            </div>
          </div>

          {log.document_number && (
            <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg flex items-center gap-2">
              <span className="text-blue-800 font-semibold">Documento Oficial Asociado:</span>
              <span className="font-mono font-bold text-blue-900">{log.document_number}</span>
            </div>
          )}

          {log.reason && (
            <div>
              <span className="font-semibold text-slate-700 block mb-1">Motivo / Justificación:</span>
              <p className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg italic">
                {log.reason}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-slate-700 block mb-1">Valores Anteriores:</span>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-52">
                {oldData ? (
                  <pre>{JSON.stringify(oldData, null, 2)}</pre>
                ) : (
                  <span className="text-slate-600 italic">Sin datos previos (nuevo registro)</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">Valores Nuevos:</span>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-52">
                {newData ? (
                  <pre>{JSON.stringify(newData, null, 2)}</pre>
                ) : (
                  <span className="text-slate-600 italic">Sin cambios directos</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-right">
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
