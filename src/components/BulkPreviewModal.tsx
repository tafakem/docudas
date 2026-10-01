import React from 'react';
import { X, CheckCircle2, ShieldCheck, Layers, FileText, AlertCircle } from 'lucide-react';
import { AuthorizationItem } from '../types';

interface Props {
  authorization: AuthorizationItem;
  grandTotal: number;
  startNumber: string;
  endNumber: string;
  previewItems: Array<{
    plannedNumber: string;
    recipientId: number;
    recipientName: string;
    bossName: string;
    bossPosition: string;
  }>;
  subject: string;
  description: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BulkPreviewModal: React.FC<Props> = ({
  authorization,
  grandTotal,
  startNumber,
  endNumber,
  previewItems,
  subject,
  description,
  loading,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base text-white">Vista Previa de Generación Masiva</h3>
              <p className="text-xs text-slate-400">Verifique la correlación de números y destinatarios antes de confirmar</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-white rounded-md transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[calc(80vh-130px)] overflow-y-auto">
          {/* Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-600 block">Tipo de Documento:</span>
              <strong className="text-slate-900 font-semibold">MEMORÁNDUM</strong>
            </div>
            <div>
              <span className="text-slate-600 block">Autorización Administrativa:</span>
              <strong className="text-indigo-600 font-mono font-semibold">{authorization.code}</strong>
            </div>
            <div>
              <span className="text-slate-600 block">Operación:</span>
              <strong className="text-slate-900 font-semibold">{authorization.operation_type}</strong>
            </div>
            <div>
              <span className="text-slate-600 block">Cantidad a Generar:</span>
              <span className="text-emerald-700 font-bold text-sm">{grandTotal} documentos</span>
            </div>
            <div>
              <span className="text-slate-600 block">Rango de Correlativos:</span>
              <span className="text-slate-900 font-mono font-bold">
                {startNumber} → {endNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-600 block">Saldo Restante de Cuota:</span>
              <span className="text-slate-700 font-medium">
                {authorization.available_qty - grandTotal} disponibles
              </span>
            </div>
          </div>

          {/* Subject & Description */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <div>
              <span className="font-semibold text-slate-700">Asunto Común:</span>
              <p className="text-slate-900 font-medium mt-0.5">{subject}</p>
            </div>
            {description && (
              <div className="pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700">Descripción:</span>
                <p className="text-slate-600 italic mt-0.5">{description}</p>
              </div>
            )}
          </div>

          {/* Planned numbers table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Listado de {previewItems.length} memorándums correlativos:</span>
              <span className="text-[11px] font-normal text-slate-600">Cada memorándum se registrará de forma individual e independiente</span>
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-12 text-center">#</th>
                    <th className="px-3 py-2 w-28">Número Previsto</th>
                    <th className="px-3 py-2">Destinatario</th>
                    <th className="px-3 py-2">Responsable Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{item.plannedNumber}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-900">{item.recipientName}</td>
                      <td className="px-3 py-1.5 text-slate-600">
                        {item.bossName} <span className="text-[10px] text-slate-600">({item.bossPosition})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="leading-tight">
              <strong>Transaccionalidad Segura:</strong> Al confirmar, se generarán atómicamente todos los documentos
              con su respectivo número correlativo garantizado, actualizando el saldo de la autorización y registrando el
              lote y la auditoría correspondiente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            {loading ? (
              'Generando lote...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                CONFIRMAR GENERACIÓN ({grandTotal})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
