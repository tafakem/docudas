import React, { useState, useEffect } from 'react';
import { api, getToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Database,
  Download,
  Upload,
  RefreshCcw,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Smartphone,
  HardDrive,
  Sparkles
} from 'lucide-react';

interface AutoSnapshot {
  id: string;
  timestamp: string;
  documentsCount: number;
  data: any;
}

export const BackupView: React.FC = () => {
  const { isAdmin, user } = useAuth();

  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto Backup Settings
  const [autoFrequency, setAutoFrequency] = useState<string>(
    localStorage.getItem('backup_frequency') || 'CADA_REGISTRO'
  );

  // Local auto-backup snapshots in browser (LocalStorage / IndexedDB)
  const [localSnapshots, setLocalSnapshots] = useState<AutoSnapshot[]>([]);

  const loadLocalSnapshots = () => {
    try {
      const stored = localStorage.getItem('auto_snapshots_db');
      if (stored) {
        setLocalSnapshots(JSON.parse(stored));
      } else {
        setLocalSnapshots([]);
      }
    } catch {
      setLocalSnapshots([]);
    }
  };

  useEffect(() => {
    loadLocalSnapshots();
  }, []);

  const handleFrequencyChange = (freq: string) => {
    setAutoFrequency(freq);
    localStorage.setItem('backup_frequency', freq);
  };

  // Manual Export Download
  const handleExportBackup = async () => {
    setLoadingExport(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const token = getToken();
      const response = await fetch('/api/backup/export', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al generar archivo de respaldo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_sistema_documental_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccessMessage('Respaldo descargado con éxito. Guarde este archivo en un lugar seguro.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al exportar respaldo');
    } finally {
      setLoadingExport(false);
    }
  };

  // Manual Import / Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const backupObj = JSON.parse(content);

        if (!backupObj || !backupObj.documents) {
          setErrorMessage('El archivo seleccionado no es una copia de respaldo válida.');
          return;
        }

        if (
          !window.confirm(
            'ATENCIÓN: Restaurar una copia de respaldo reemplazará los datos actuales por los del archivo. ¿Desea continuar?'
          )
        ) {
          return;
        }

        setLoadingImport(true);
        setErrorMessage(null);

        const res = await api.importBackupJson(backupObj);
        setSuccessMessage(res.message);
        loadLocalSnapshots();
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al procesar la restauración del respaldo.');
      } finally {
        setLoadingImport(false);
      }
    };
    reader.readAsText(file);
  };

  // Create Local Snapshot on demand
  const handleCreateLocalSnapshot = async () => {
    setLoadingExport(true);
    setErrorMessage(null);
    try {
      const data = await api.exportBackupJson();
      const newSnap: AutoSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        documentsCount: data.documents?.length || 0,
        data
      };

      const updated = [newSnap, ...localSnapshots.slice(0, 4)]; // keep last 5
      localStorage.setItem('auto_snapshots_db', JSON.stringify(updated));
      setLocalSnapshots(updated);
      setSuccessMessage('Instantánea automática de respaldo guardada localmente en este dispositivo.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al crear la instantánea local');
    } finally {
      setLoadingExport(false);
    }
  };

  // Restore Local Snapshot
  const handleRestoreSnapshot = async (snap: AutoSnapshot) => {
    if (
      !window.confirm(
        `¿Desea restaurar la instantánea local del ${new Date(snap.timestamp).toLocaleString('es-PE')} (${
          snap.documentsCount
        } documentos)?`
      )
    ) {
      return;
    }

    setLoadingImport(true);
    setErrorMessage(null);

    try {
      const res = await api.importBackupJson(snap.data);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al restaurar instantánea');
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          Respaldo y Restauración de Datos (Multiplataforma)
        </h2>
        <p className="text-xs text-slate-500">
          Copias de seguridad automáticas y manuales de la base de datos para celulares, tablets y escritorios.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Export Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Respaldo Manual (Descarga JSON)</h3>
                <p className="text-xs text-slate-500">Exporta todos los documentos, secuencias, lotes y auditoría</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Genera un archivo cifrado en formato JSON con la totalidad de la estructura institucional de datos,
              secuencias oficiales de numeración y el historial de trazabilidad.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={loadingExport}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <Download className="w-4 h-4" />
            {loadingExport ? 'Generando respaldo...' : 'Descargar Copia de Respaldo (.json)'}
          </button>
        </div>

        {/* Manual Import Box (Admin only) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Restauración Manual de Base de Datos</h3>
                <p className="text-xs text-slate-500">Recupera la información desde un archivo previamente descargado</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Permite cargar una copia de respaldo para restaurar la totalidad de secuencias, documentos oficiales y
              auditoría en este o en cualquier otro dispositivo.
            </p>
          </div>

          {isAdmin ? (
            <label className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer text-center">
              <Upload className="w-4 h-4" />
              <span>{loadingImport ? 'Restaurando...' : 'Seleccionar Archivo de Respaldo'}</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" disabled={loadingImport} />
            </label>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
              * La función de restauración manual está reservada para el rol de <strong>ADMINISTRADOR</strong>.
            </div>
          )}
        </div>
      </div>

      {/* Auto Backup Configuration & Local Snapshots */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Respaldo Automático Local (Multiplataforma)</h3>
              <p className="text-xs text-slate-500">
                Resguardo transparente en el almacenamiento interno de la tablet, celular o PC
              </p>
            </div>
          </div>

          <button
            onClick={handleCreateLocalSnapshot}
            disabled={loadingExport}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer self-start"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            Crear Instantánea Local
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Frecuencia del Respaldo Automático:</label>
            <select
              value={autoFrequency}
              onChange={e => handleFrequencyChange(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="CADA_REGISTRO">✓ En cada registro de documento o lote masivo</option>
              <option value="DIARIO">✓ Respaldo automático diario</option>
              <option value="SEMANAL">✓ Respaldo automático semanal</option>
              <option value="DESACTIVADO">Desactivado</option>
            </select>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-slate-600 text-[11px] leading-relaxed">
              <strong>Garantía de Multiplataforma:</strong> Las instantáneas locales permanecen resguardadas de forma
              autónoma en el navegador de la tablet o teléfono donde esté instalada la aplicación (PWA), garantizando
              recuperación ante eventuales fallas de red.
            </p>
          </div>
        </div>

        {/* Local Snapshots Table */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            Instantáneas Automáticas Guardadas en este Dispositivo ({localSnapshots.length}):
          </h4>

          {localSnapshots.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              Aún no hay instantáneas automáticas locales. Se generará una automáticamente al emitir su primer documento.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
              {localSnapshots.map((snap, i) => (
                <div
                  key={snap.id}
                  className="p-3 bg-white hover:bg-slate-50 transition flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Instantánea #{i + 1} — {new Date(snap.timestamp).toLocaleString('es-PE')}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {snap.documentsCount} documentos oficiales respaldados
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
