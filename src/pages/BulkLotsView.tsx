import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BulkLot, DocumentItem } from '../types';
import { DocumentDetailModal } from '../components/DocumentDetailModal';
import {
  History,
  Layers,
  Calendar,
  FileText,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Building
} from 'lucide-react';

export const BulkLotsView: React.FC = () => {
  const [lots, setLots] = useState<BulkLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected lot inspection
  const [selectedLot, setSelectedLot] = useState<BulkLot | null>(null);
  const [lotDocuments, setLotDocuments] = useState<DocumentItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Document detail modal inside lot
  const [inspectDocId, setInspectDocId] = useState<number | null>(null);

  const loadLots = () => {
    setLoading(true);
    api
      .getBulkLots({ page: page.toString(), limit: '15' })
      .then(res => {
        setLots(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLots();
  }, [page]);

  const handleInspectLot = (lot: BulkLot) => {
    setSelectedLot(lot);
    setLoadingDetail(true);
    api
      .getBulkLotDetail(lot.id)
      .then(res => {
        setLotDocuments(res.documents);
        setLoadingDetail(false);
      })
      .catch(err => {
        setError(err.message);
        setLoadingDetail(false);
      });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          Historial de Registros Masivos (Lotes)
        </h2>
        <p className="text-xs text-slate-500">
          Consulta de lotes de memorándums emitidos mediante autorizaciones administrativas con detalle individual.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>
      )}

      {/* Lots Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Código de Lote</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Operación</th>
                <th className="px-3 py-3">Autorización</th>
                <th className="px-3 py-3 text-center">Cantidad</th>
                <th className="px-4 py-3">Destinatario(s)</th>
                <th className="px-3 py-3">Usuario</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && lots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Cargando historial de lotes...
                  </td>
                </tr>
              ) : lots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No se han registrado operaciones de lotes masivos.
                  </td>
                </tr>
              ) : (
                lots.map(lot => (
                  <tr key={lot.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700 whitespace-nowrap">{lot.code}</td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{lot.date}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{lot.operation_type}</td>
                    <td className="px-3 py-3 font-mono text-slate-700">{lot.authorization_code || 'N/A'}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-900">{lot.quantity} docs</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={lot.recipients_summary}>
                      {lot.recipients_summary}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{lot.user_name}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        {lot.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleInspectLot(lot)}
                        className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Lote
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-600">
          <span>Total de {total} lotes masivos</span>
          <div className="flex items-center gap-2">
            <span>
              Página {page} de {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Lot Detail Modal */}
      {selectedLot && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base text-white">Inspección de Lote: {selectedLot.code}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedLot.quantity} memorándums individuales generados el {selectedLot.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLot(null)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 block">Autorización:</span>
                  <strong className="text-slate-800 font-mono">{selectedLot.authorization_code || 'Sin autorización'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Operación:</span>
                  <strong className="text-slate-800">{selectedLot.operation_type}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Registrado por:</span>
                  <span className="text-slate-800 font-medium">{selectedLot.user_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Modalidad:</span>
                  <span className="text-slate-800 font-medium">{selectedLot.distribution_mode}</span>
                </div>
                <div className="col-span-2 sm:col-span-4 border-t border-slate-200 pt-2">
                  <span className="text-slate-500 block">Asunto del Lote:</span>
                  <p className="text-slate-900 font-semibold mt-0.5">{selectedLot.subject}</p>
                </div>
              </div>

              {/* Table of generated documents */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Documentos individuales emitidos en este lote:
                </h4>
                {loadingDetail ? (
                  <div className="p-6 text-center text-slate-500">Cargando memorándums del lote...</div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                        <tr>
                          <th className="px-3 py-2 w-10 text-center">#</th>
                          <th className="px-3 py-2 w-32">Número Oficial</th>
                          <th className="px-3 py-2">Destinatario</th>
                          <th className="px-3 py-2">Responsable</th>
                          <th className="px-3 py-2 text-center">Estado</th>
                          <th className="px-3 py-2 text-right">Ver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {lotDocuments.map((doc, idx) => (
                          <tr key={doc.id} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{doc.formatted_number}</td>
                            <td className="px-3 py-1.5 font-medium text-slate-900">
                              {(doc as any).recipient_name || 'Destinatario'}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">{(doc as any).boss_name || 'N/A'}</td>
                            <td className="px-3 py-1.5 text-center">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                {doc.status}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                onClick={() => setInspectDocId(doc.id)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Ver Ficha Completa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-right">
              <button
                onClick={() => setSelectedLot(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {inspectDocId && (
        <DocumentDetailModal documentId={inspectDocId} onClose={() => setInspectDocId(null)} />
      )}
    </div>
  );
};
