import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  FileText,
  FileSpreadsheet,
  Layers,
  Calendar,
  CheckCircle,
  Hash,
  Users,
  Building,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface Props {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<Props> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = () => {
    setLoading(true);
    api
      .getDashboardStats()
      .then(res => {
        setStats(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Consultando estadísticas en tiempo real...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-xs text-rose-600 font-medium">Error al cargar estadísticas: {error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
            Resumen Operativo {stats.currentYear}
          </span>
          <h2 className="text-xl font-bold mt-2 tracking-tight">Panel de Control y Gestión Documental</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Monitoreo centralizado de secuencias oficiales, emisión de memorándums, oficios y lotes masivos
            transaccionales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('register')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Registrar Documento
          </button>
          <button
            onClick={() => onNavigate('bulk-register')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            Emisión Masiva
          </button>
        </div>
      </div>

      {/* Main KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total de Documentos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalDocuments}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{stats.registeredThisYear}</span> emitidos este año
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Memorándums</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-950 tracking-tight">{stats.totalMemorandums}</div>
          <div className="text-[11px] text-slate-500 mt-1">Secuencia compartida activa</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Oficios y Oficios Múltiples</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalOficios + stats.totalOficiosMultiples}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span>{stats.totalOficios} Oficios</span>
            <span>•</span>
            <span className="font-semibold text-teal-700">{stats.totalOficiosMultiples} Oficios Múltiples</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Lotes Masivos Emitidos</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalLots}</div>
          <div className="text-[11px] text-slate-500 mt-1">Por autorizaciones administrativas</div>
        </div>
      </div>

      {/* Numbering Pool Status & Periodic Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Numbering Pool Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                Estado del Fondo de Numeración
              </h3>
              <button
                onClick={() => onNavigate('numbering')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                Control <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Control de números utilizados definitivamente, reservas concurrentes en curso y números reciclados.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-900">Números Utilizados Definitivamente</span>
                </div>
                <span className="text-sm font-black text-emerald-900 font-mono">
                  {stats.numberingSummary.usedCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-900">Reservas Activas Temporales</span>
                </div>
                <span className="text-sm font-black text-blue-900 font-mono">
                  {stats.numberingSummary.reservedCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">Números Liberados / Reciclados</span>
                </div>
                <span className="text-sm font-black text-slate-800 font-mono">
                  {stats.numberingSummary.releasedCount}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            * Cada número liberado por cambio de tipo o cancelación vuelve a estar disponible para el próximo usuario.
          </div>
        </div>

        {/* Activity & Period Indicators */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Flujo por Período
          </h3>
          <p className="text-xs text-slate-500 mb-4">Registro cronológico de documentos oficiales en la entidad.</p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Registrados Hoy</span>
                <span className="font-bold text-slate-900">{stats.registeredToday} documentos</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, stats.registeredToday * 10)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Registrados este Mes</span>
                <span className="font-bold text-slate-900">{stats.registeredThisMonth} documentos</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, stats.registeredThisMonth * 4)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Acumulado Anual ({stats.currentYear})</span>
                <span className="font-bold text-slate-900">{stats.registeredThisYear} documentos</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, stats.registeredThisYear * 2)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Gestión de Destinatarios</span>
            <button
              onClick={() => onNavigate('recipients')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Directorio de Áreas →
            </button>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Distribución por Estado
          </h3>
          <p className="text-xs text-slate-500 mb-4">Clasificación administrativa de expedientes y actuaciones.</p>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {stats.byStatus.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                <span className="font-semibold text-slate-800">{item.status}</span>
                <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdowns: By User & By Recipient */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By User */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Emisión por Usuario Operador
          </h3>
          <div className="divide-y divide-slate-100">
            {stats.byUser.map((u, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800">{u.user_name}</span>
                <span className="font-mono font-bold text-blue-700">{u.count} docs</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Recipient */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            Destinatarios con Mayor Frecuencia
          </h3>
          <div className="divide-y divide-slate-100">
            {stats.byRecipient.map((r, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 truncate max-w-xs">{r.recipient_name}</span>
                <span className="font-mono font-bold text-indigo-700">{r.count} docs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
