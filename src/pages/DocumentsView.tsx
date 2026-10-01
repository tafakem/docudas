import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { DocumentItem, Recipient, DocType, DocStatus } from '../types';
import { DocumentDetailModal } from '../components/DocumentDetailModal';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { EditDocumentModal } from '../components/EditDocumentModal';
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Building,
  User,
  Layers,
  X,
  Copy,
  Check
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const [copiedDocId, setCopiedDocId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state (server-side)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [number, setNumber] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [bossName, setBossName] = useState('');
  const [lotCode, setLotCode] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Recipients directory for filter dropdown
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  // Modals state
  const [detailDocId, setDetailDocId] = useState<number | null>(null);
  const [statusDoc, setStatusDoc] = useState<DocumentItem | null>(null);
  const [editDoc, setEditDoc] = useState<DocumentItem | null>(null);

  // Load recipients
  useEffect(() => {
    api.getRecipients(true).then(res => setRecipients(res.recipients)).catch(() => {});
  }, []);

  const loadDocuments = useCallback(() => {
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString()
    };

    if (search.trim()) params.search = search.trim();
    if (docType) params.doc_type = docType;
    if (year) params.year = year;
    if (number.trim()) params.number = number.trim();
    if (status) params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (recipientId) params.recipient_id = recipientId;
    if (bossName.trim()) params.boss_name = bossName.trim();
    if (lotCode.trim()) params.lot_code = lotCode.trim();
    if (authCode.trim()) params.authorization_code = authCode.trim();

    api
      .getDocuments(params)
      .then(res => {
        setDocuments(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [page, limit, search, docType, year, number, status, dateFrom, dateTo, recipientId, bossName, lotCode, authCode]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleResetFilters = () => {
    setSearch('');
    setDocType('');
    setYear('');
    setNumber('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setRecipientId('');
    setBossName('');
    setLotCode('');
    setAuthCode('');
    setPage(1);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'REGISTRADO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ENVIADO':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'RECIBIDO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ATENDIDO':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'OBSERVADO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ANULADO':
      case 'CANCELADO':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const exportUrl = api.getExportUrl({
    doc_type: docType,
    year,
    status,
    date_from: dateFrom,
    date_to: dateTo
  });

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Control de Documentos Oficiales
          </h2>
          <p className="text-xs text-slate-500">
            Búsqueda, auditoría, seguimiento y trazabilidad con paginación server-side para alta escala.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
              showFilters || docType || year || number || status || dateFrom || recipientId
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros Avanzados</span>
            {(docType || year || number || status || dateFrom || recipientId) && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>

          <a
            href={exportUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs"
            title="Exportar registros filtrados a CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </a>

          <button
            onClick={loadDocuments}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition"
            title="Actualizar tabla"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por número (ej: 0012-2026), asunto o descripción del documento..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Documento:</label>
              <select
                value={docType}
                onChange={e => {
                  setDocType(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-slate-300 rounded-md p-1.5 bg-white text-slate-800"
              >
                <option value="">-- Todos los Tipos --</option>
                <option value="MEMORANDUM">MEMORÁNDUM</option>
                <option value="OFICIO">OFICIO</option>
                <option value="OFICIO_MULTIPLE">OFICIO MÚLTIPLE</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Año:</label>
              <input
                type="number"
                value={year}
                onChange={e => {
                  setYear(e.target.value);
                  setPage(1);
                }}
                placeholder="2026"
                className="w-full border border-slate-300 rounded-md p-1.5"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Número Correlativo:</label>
              <input
                type="number"
                value={number}
                onChange={e => {
                  setNumber(e.target.value);
                  setPage(1);
                }}
                placeholder="Ej: 15"
                className="w-full border border-slate-300 rounded-md p-1.5"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Estado Administrativo:</label>
              <select
                value={status}
                onChange={e => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-slate-300 rounded-md p-1.5 bg-white text-slate-800"
              >
                <option value="">-- Todos los Estados --</option>
                <option value="REGISTRADO">REGISTRADO</option>
                <option value="ENVIADO">ENVIADO</option>
                <option value="RECIBIDO">RECIBIDO</option>
                <option value="ATENDIDO">ATENDIDO</option>
                <option value="OBSERVADO">OBSERVADO</option>
                <option value="ANULADO">ANULADO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Destinatario:</label>
              <select
                value={recipientId}
                onChange={e => {
                  setRecipientId(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-slate-300 rounded-md p-1.5 bg-white text-slate-800"
              >
                <option value="">-- Todas las Áreas --</option>
                {recipients.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.acronym})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jefe / Responsable:</label>
              <input
                type="text"
                value={bossName}
                onChange={e => {
                  setBossName(e.target.value);
                  setPage(1);
                }}
                placeholder="Nombre del jefe..."
                className="w-full border border-slate-300 rounded-md p-1.5"
              />
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

            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar todos los filtros
              </button>

              <span className="text-[11px] text-slate-500">
                Filtros aplicados directamente a la base de datos (con índices)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Número Oficial</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-4 py-3">Asunto</th>
                <th className="px-4 py-3">Destinatario / Responsable</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3">Registrador</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                    Consultando documentos en la base de datos...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No se encontraron documentos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition group">
                    {/* Número Oficial */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-700 font-black">{doc.formatted_number}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(doc.formatted_number);
                            setCopiedDocId(doc.id);
                            setTimeout(() => setCopiedDocId(null), 2000);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Copiar número de documento"
                        >
                          {copiedDocId === doc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {doc.lot_code && (
                          <span
                            title={`Lote Masivo: ${doc.lot_code}`}
                            className="p-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200"
                          >
                            <Layers className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {doc.doc_type === 'OFICIO_MULTIPLE' ? (
                        <span className="text-teal-700 font-semibold">OFICIO MÚLTIPLE</span>
                      ) : (
                        doc.doc_type
                      )}
                    </td>

                    {/* Fecha */}
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{doc.date}</td>

                    {/* Asunto */}
                    <td className="px-4 py-3 text-slate-800 max-w-xs">
                      <span className="font-semibold block truncate" title={doc.subject}>
                        {doc.subject}
                      </span>
                      {doc.description && (
                        <span className="text-[11px] text-slate-600 block truncate" title={doc.description}>
                          {doc.description}
                        </span>
                      )}
                    </td>

                    {/* Destinatario */}
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <span className="font-medium block truncate text-slate-900" title={doc.recipients_text}>
                        {doc.recipients_text || 'Sin destinatario'}
                      </span>
                      {doc.bosses_text && (
                        <span className="text-[11px] text-slate-600 block truncate" title={doc.bosses_text}>
                          Resp: {doc.bosses_text}
                        </span>
                      )}
                      {doc.recipient_count && doc.recipient_count > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold inline-block mt-0.5">
                          {doc.recipient_count} Destinatarios
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${getStatusBadge(
                          doc.status
                        )}`}
                      >
                        {doc.status}
                      </span>
                    </td>

                    {/* Registrador */}
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-[11px]">{doc.user_name}</td>

                    {/* Acciones */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailDocId(doc.id)}
                          title="Ver Detalle Completo"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setEditDoc(doc)}
                          title="Editar Asunto / Descripción"
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setStatusDoc(doc)}
                          title="Cambiar Estado / Anular"
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <select
              value={limit}
              onChange={e => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="border border-slate-300 rounded px-2 py-1 bg-white font-medium text-slate-800"
            >
              <option value="10">10 registros</option>
              <option value="25">25 registros</option>
              <option value="50">50 registros</option>
              <option value="100">100 registros</option>
            </select>
            <span>de un total de <strong className="text-slate-900 font-bold">{total}</strong> registros</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium">
              Página {page} de {totalPages || 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {detailDocId && (
        <DocumentDetailModal
          documentId={detailDocId}
          onClose={() => setDetailDocId(null)}
          onStatusChangeRequested={doc => {
            setDetailDocId(null);
            setStatusDoc(doc);
          }}
        />
      )}

      {statusDoc && (
        <StatusChangeModal
          document={statusDoc}
          onClose={() => setStatusDoc(null)}
          onSuccess={() => {
            setStatusDoc(null);
            loadDocuments();
          }}
        />
      )}

      {editDoc && (
        <EditDocumentModal
          document={editDoc}
          onClose={() => setEditDoc(null)}
          onSuccess={() => {
            setEditDoc(null);
            loadDocuments();
          }}
        />
      )}
    </div>
  );
};
