import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { AuditPayloadModal } from '../components/AuditPayloadModal';
import {
  FileSearch,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  ShieldCheck,
  Search,
  X
} from 'lucide-react';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [userName, setUserName] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected for payload modal
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);

  const loadLogs = () => {
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString()
    };
    if (action) params.action = action;
    if (entityType) params.entity_type = entityType;
    if (userName.trim()) params.user_name = userName.trim();
    if (search.trim()) params.search = search.trim();
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    api
      .getAuditLogs(params)
      .then(res => {
        setLogs(res.items);
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
    loadLogs();
  }, [page, limit, action, entityType, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setAction('');
    setEntityType('');
    setUserName('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const getActionBadge = (act: string) => {
    if (act.includes('CREADO') || act.includes('INICIALIZADO')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (act.includes('RESERVADO')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    if (act.includes('LIBERADO') || act.includes('EXPIRADA')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (act.includes('ANULADO') || act.includes('CANCELADO')) {
      return 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
    }
    if (act.includes('MASIVO')) {
      return 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-blue-600" />
            Auditoría General y Trazabilidad del Sistema
          </h2>
          <p className="text-xs text-slate-500">
            Registro inmutable de todas las reservas de números, liberaciones, firmas, modificaciones, anulaciones y
            operaciones masivas.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition flex items-center gap-1.5 text-xs font-semibold self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Registros
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Acción Registrada:</label>
            <select
              value={action}
              onChange={e => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-300 rounded-md p-1.5 bg-white text-slate-800"
            >
              <option value="">-- Todas las Acciones --</option>
              <option value="NUMERO_RESERVADO">NUMERO_RESERVADO</option>
              <option value="NUMERO_LIBERADO">NUMERO_LIBERADO</option>
              <option value="RESERVA_EXPIRADA">RESERVA_EXPIRADA</option>
              <option value="DOCUMENTO_CREADO">DOCUMENTO_CREADO</option>
              <option value="DOCUMENTO_MODIFICADO">DOCUMENTO_MODIFICADO</option>
              <option value="DOCUMENTO_ANULADO">DOCUMENTO_ANULADO</option>
              <option value="LOTE_GENERADO_MASIVO">LOTE_GENERADO_MASIVO</option>
              <option value="AUTORIZACION_CREADA">AUTORIZACION_CREADA</option>
              <option value="INICIO_SESION">INICIO_SESION</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Entidad:</label>
            <select
              value={entityType}
              onChange={e => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-300 rounded-md p-1.5 bg-white text-slate-800"
            >
              <option value="">-- Todas las Entidades --</option>
              <option value="DOCUMENTO">DOCUMENTO</option>
              <option value="NUMERACION">NUMERACION</option>
              <option value="LOTE">LOTE</option>
              <option value="AUTORIZACION">AUTORIZACION</option>
              <option value="DESTINATARIO">DESTINATARIO</option>
              <option value="USUARIO">USUARIO</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Desde:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-300 rounded-md p-1.5"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Hasta:</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-300 rounded-md p-1.5"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por número (0012-2026), lote o motivo..."
              className="w-full border border-slate-300 rounded-md px-2.5 py-1 text-xs"
            />
          </div>

          {(action || entityType || dateFrom || dateTo || search) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 self-start"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-3 py-3">Usuario Responsable</th>
                <th className="px-3 py-3">Acción Registrada</th>
                <th className="px-3 py-3">Entidad</th>
                <th className="px-3 py-3">Documento / Lote</th>
                <th className="px-4 py-3">Motivo / Detalle Operativo</th>
                <th className="px-3 py-3 text-right">Datos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Cargando registros de auditoría...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron eventos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                      {new Date(log.created_at).toLocaleString('es-PE')}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900 whitespace-nowrap">{log.user_name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-700 text-[11px]">{log.entity_type}</td>
                    <td className="px-3 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {log.document_number || log.lot_code || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-sm truncate" title={log.reason}>
                      {log.reason || '—'}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 rounded border border-blue-200 flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Payload
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
          <span>Total de {total} eventos auditados</span>
          <div className="flex items-center gap-2">
            <span>
              Página {page} de {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {inspectLog && <AuditPayloadModal log={inspectLog} onClose={() => setInspectLog(null)} />}
    </div>
  );
};
