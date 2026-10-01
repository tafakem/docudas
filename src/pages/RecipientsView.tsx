import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Recipient } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  Building,
  Plus,
  Edit,
  Power,
  Search,
  CheckCircle,
  XCircle,
  X,
  AlertCircle
} from 'lucide-react';

export const RecipientsView: React.FC = () => {
  const { isAdmin } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal create/edit
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    acronym: '',
    bossName: '',
    bossPosition: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadRecipients = () => {
    setLoading(true);
    api
      .getRecipients(true) // include inactive for management
      .then(res => {
        setRecipients(res.recipients);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRecipients();
  }, []);

  const handleOpenCreate = () => {
    setFormData({ name: '', acronym: '', bossName: '', bossPosition: '' });
    setIsCreating(true);
    setEditingRecipient(null);
  };

  const handleOpenEdit = (rec: Recipient) => {
    setFormData({
      name: rec.name,
      acronym: rec.acronym,
      bossName: rec.boss_name,
      bossPosition: rec.boss_position
    });
    setEditingRecipient(rec);
    setIsCreating(false);
  };

  const handleToggleStatus = async (rec: Recipient) => {
    try {
      await api.toggleRecipient(rec.id);
      loadRecipients();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de destinatario');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.bossName.trim() || !formData.bossPosition.trim()) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setSubmitting(true);
    try {
      if (isCreating) {
        await api.createRecipient(formData);
      } else if (editingRecipient) {
        await api.updateRecipient(editingRecipient.id, {
          ...formData,
          status: editingRecipient.status
        });
      }
      setIsCreating(false);
      setEditingRecipient(null);
      loadRecipients();
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecipients = recipients.filter(
    r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.acronym.toLowerCase().includes(search.toLowerCase()) ||
      r.boss_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users2 className="w-5 h-5 text-blue-600" />
            Catálogo de Destinatarios Institucionales
          </h2>
          <p className="text-xs text-slate-500">
            Direcciones, jefaturas y dependencias oficiales con desactivación lógica para preservar la trazabilidad
            histórica.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" />
            Nuevo Destinatario
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre de dirección, sigla o nombre del jefe/responsable..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Nombre de la Dependencia</th>
                <th className="px-3 py-3">Sigla</th>
                <th className="px-4 py-3">Jefe / Responsable</th>
                <th className="px-4 py-3">Cargo Institucional</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && recipients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Cargando catálogo...
                  </td>
                </tr>
              ) : filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron dependencias registradas.
                  </td>
                </tr>
              ) : (
                filteredRecipients.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{rec.name}</td>
                    <td className="px-3 py-3.5 font-mono font-bold text-blue-700">{rec.acronym || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-800 font-medium">{rec.boss_name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{rec.boss_position}</td>
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                          rec.status === 'ACTIVO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            title="Editar Datos"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(rec)}
                            title={rec.status === 'ACTIVO' ? 'Desactivar de forma lógica' : 'Reactivar'}
                            className={`p-1.5 rounded transition ${
                              rec.status === 'ACTIVO'
                                ? 'text-rose-500 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create / Edit */}
      {(isCreating || editingRecipient) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {isCreating ? 'Nuevo Destinatario Oficial' : 'Editar Destinatario'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingRecipient(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre de la Dependencia / Dirección <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Dirección de Abastecimiento y Servicios"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sigla Oficial:</label>
                <input
                  type="text"
                  value={formData.acronym}
                  onChange={e => setFormData({ ...formData, acronym: e.target.value.toUpperCase() })}
                  placeholder="Ej: DAS"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre del Jefe o Responsable <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={formData.bossName}
                  onChange={e => setFormData({ ...formData, bossName: e.target.value })}
                  placeholder="Ej: Ing. Jorge Alberto Mendoza Silva"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cargo del Responsable <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={formData.bossPosition}
                  onChange={e => setFormData({ ...formData, bossPosition: e.target.value })}
                  placeholder="Ej: Director de Abastecimiento"
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingRecipient(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {submitting ? 'Guardando...' : 'Guardar Destinatario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
