import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { NumberingOverviewItem, NumberReservation, DocType } from '../types';
import {
  Hash,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert
} from 'lucide-react';

export const NumberingControlView: React.FC = () => {
  const [overview, setOverview] = useState<NumberingOverviewItem[]>([]);
  const [reservations, setReservations] = useState<NumberReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for reservations log
  const [filterDocType, setFilterDocType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Manual release modal/action
  const [releaseResId, setReleaseResId] = useState<number | null>(null);
  const [releaseReason, setReleaseReason] = useState<string>('');
  const [releasing, setReleasing] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);

    Promise.all([
      api.getNumberingOverview(),
      api.getReservations({
        doc_type: filterDocType,
        status: filterStatus,
        page: page.toString(),
        limit: '20'
      })
    ])
      .then(([ovRes, resRes]) => {
        setOverview(ovRes.overview);
        setReservations(resRes.items);
        setTotal(resRes.total);
        setTotalPages(resRes.totalPages);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [filterDocType, filterStatus, page]);

  const handleExecuteRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseResId) return;

    setReleasing(true);
    try {
      await api.releaseNumber(releaseResId, releaseReason.trim() || 'Liberación manual por administración');
      setReleaseResId(null);
      setReleaseReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al liberar número');
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-600" />
            Control Centralizado de Numeración
          </h2>
          <p className="text-xs text-slate-500">
            Monitoreo en tiempo real de secuencias por tipo de documento, bloqueos de concurrencia y reciclado de
            números liberados.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition flex items-center gap-1.5 text-xs font-semibold self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Secuencias
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>
      )}

      {/* Overview Table (Section 11) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm">Estado de Secuencias por Tipo de Documento</h3>
          <span className="text-xs text-blue-300 font-medium">Año Actual {new Date().getFullYear()}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-5 py-3">Tipo de Documento</th>
                <th className="px-4 py-3 text-center">Año</th>
                <th className="px-4 py-3 text-right">Último Asignado</th>
                <th className="px-4 py-3 text-right">Próximo Disponible</th>
                <th className="px-4 py-3 text-center">Utilizados</th>
                <th className="px-4 py-3 text-center">Reservados (Activos)</th>
                <th className="px-4 py-3 text-center">Liberados / Reciclados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.map(item => (
                <tr key={item.docType} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {item.docType === 'OFICIO_MULTIPLE' ? 'OFICIO MÚLTIPLE' : item.docType}
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-600">{item.year}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                    {item.lastNumber}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-blue-700 text-sm">
                    {item.formattedNext}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold font-mono">
                      {item.usedCount}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold font-mono">
                      {item.reservedCount}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold font-mono">
                      {item.releasedCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reservations & Releases Log */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Trazabilidad de Reservas y Liberaciones</h3>
            <p className="text-xs text-slate-500">
              Registro pormenorizado de quién reservó, utilizó o liberó cada correlativo oficial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterDocType}
              onChange={e => {
                setFilterDocType(e.target.value);
                setPage(1);
              }}
              className="border border-slate-300 rounded-lg p-1.5 text-xs bg-white text-slate-800"
            >
              <option value="">-- Todos los Tipos --</option>
              <option value="MEMORANDUM">MEMORÁNDUM</option>
              <option value="OFICIO">OFICIO</option>
              <option value="OFICIO_MULTIPLE">OFICIO MÚLTIPLE</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="border border-slate-300 rounded-lg p-1.5 text-xs bg-white text-slate-800"
            >
              <option value="">-- Todos los Estados --</option>
              <option value="RESERVADO">RESERVADO</option>
              <option value="UTILIZADO">UTILIZADO</option>
              <option value="LIBERADO">LIBERADO</option>
              <option value="EXPIRADO">EXPIRADO</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-3 py-2.5">Número</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Usuario que Reservó</th>
                <th className="px-3 py-2.5">Fecha Reserva</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Liberación / Expiración</th>
                <th className="px-3 py-2.5">Motivo</th>
                <th className="px-3 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    No hay reservas registradas.
                  </td>
                </tr>
              ) : (
                reservations.map(res => (
                  <tr key={res.id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{res.formatted_number}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{res.doc_type}</td>
                    <td className="px-3 py-2.5 text-slate-800">{res.user_name}</td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono text-[11px]">
                      {new Date(res.reserved_at).toLocaleString('es-PE')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          res.status === 'UTILIZADO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : res.status === 'RESERVADO'
                            ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
                            : res.status === 'LIBERADO'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {res.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 text-[11px]">
                      {res.released_at ? (
                        <span>
                          {new Date(res.released_at).toLocaleString('es-PE')}{' '}
                          {res.released_by_user_name && `(${res.released_by_user_name})`}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate" title={res.release_reason}>
                      {res.release_reason || (res.document_id ? `Documento #${res.document_id}` : '—')}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {res.status === 'RESERVADO' && (
                        <button
                          onClick={() => setReleaseResId(res.id)}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200"
                        >
                          Liberar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
          <span>Total de {total} registros de numeración</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 border border-slate-300 rounded bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 border border-slate-300 rounded bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Release Confirmation Modal */}
      {releaseResId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-1">Liberar Número Reservado</h3>
            <p className="text-xs text-slate-600 mb-4">
              Al liberar el número, volverá a estar <strong>DISPONIBLE</strong> en la secuencia para que cualquier otro
              usuario de la entidad pueda reservarlo.
            </p>

            <form onSubmit={handleExecuteRelease} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo de la liberación:</label>
                <input
                  type="text"
                  value={releaseReason}
                  onChange={e => setReleaseReason(e.target.value)}
                  placeholder="Ej: Descarte de trámite / Cambio de tipo"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReleaseResId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={releasing}
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                >
                  {releasing ? 'Liberando...' : 'Confirmar Liberación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
