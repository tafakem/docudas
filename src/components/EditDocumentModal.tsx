import React, { useState, useEffect } from 'react';
import { DocumentItem, Recipient } from '../types';
import { api } from '../services/api';
import { X, Edit3, Save, Building, CheckSquare, Square, Calendar } from 'lucide-react';

interface Props {
  document: DocumentItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditDocumentModal: React.FC<Props> = ({ document: doc, onClose, onSuccess }) => {
  const [subject, setSubject] = useState(doc.subject);
  const [description, setDescription] = useState(doc.description || '');
  const [observations, setObservations] = useState(doc.observations || '');
  const [date, setDate] = useState(doc.date || '');

  // Recipients catalog and selected recipient IDs
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [multipleRecipientIds, setMultipleRecipientIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recipients and existing document detail
  useEffect(() => {
    setLoadingLoadingData(true);
    Promise.all([api.getRecipients(true), api.getDocumentDetail(doc.id)])
      .then(([recRes, docDetail]) => {
        setRecipients(recRes.recipients);

        const currentRecs = docDetail.recipients || [];
        if (doc.doc_type === 'OFICIO_MULTIPLE') {
          setMultipleRecipientIds(currentRecs.map((r: any) => r.recipient_id));
        } else if (currentRecs.length > 0) {
          setSelectedRecipientId(currentRecs[0].recipient_id.toString());
        }

        setLoadingLoadingData(false);
      })
      .catch(err => {
        setError(err.message || 'Error al cargar destinatarios');
        setLoadingLoadingData(false);
      });
  }, [doc.id, doc.doc_type]);

  const handleToggleMultipleRecipient = (id: number) => {
    setMultipleRecipientIds(prev =>
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('El asunto es obligatorio.');
      return;
    }

    const recipientIdsToSubmit =
      doc.doc_type === 'OFICIO_MULTIPLE'
        ? multipleRecipientIds
        : selectedRecipientId
        ? [parseInt(selectedRecipientId)]
        : [];

    if (recipientIdsToSubmit.length === 0) {
      setError(
        doc.doc_type === 'OFICIO_MULTIPLE'
          ? 'Debe seleccionar al menos un destinatario para el Oficio Múltiple.'
          : 'Debe seleccionar un destinatario.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateDocument(doc.id, {
        subject: subject.trim(),
        description: description.trim(),
        observations: observations.trim(),
        date,
        recipientIds: recipientIdsToSubmit
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar documento');
      setLoading(false);
    }
  };

  const currentSingleRecipient = recipients.find(r => r.id.toString() === selectedRecipientId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Editar Documento Oficial</h3>
              <p className="text-xs text-slate-400 font-mono">N° {doc.formatted_number} ({doc.doc_type})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {loadingData ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              Cargando catálogo de destinatarios...
            </div>
          ) : (
            <>
              {/* Fecha y Número */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Número Oficial (Protegido):</label>
                  <input
                    type="text"
                    value={doc.formatted_number}
                    readOnly
                    className="w-full bg-slate-200 border border-slate-300 rounded-md px-2.5 py-1.5 font-mono font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha del Documento:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Recipient Editor */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-blue-600" />
                  Editar Destinatario{doc.doc_type === 'OFICIO_MULTIPLE' ? 's (Oficio Múltiple)' : ''}:
                </label>

                {doc.doc_type !== 'OFICIO_MULTIPLE' ? (
                  <div className="space-y-2">
                    <select
                      value={selectedRecipientId}
                      onChange={e => setSelectedRecipientId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      {recipients.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.acronym ? `(${r.acronym})` : ''}
                        </option>
                      ))}
                    </select>

                    {currentSingleRecipient && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500 block">Jefe / Responsable:</span>
                          <strong className="text-slate-900">{currentSingleRecipient.boss_name}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Cargo:</span>
                          <span className="text-slate-700">{currentSingleRecipient.boss_position}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {recipients.map(r => {
                      const isChecked = multipleRecipientIds.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          onClick={() => handleToggleMultipleRecipient(r.id)}
                          className={`p-2 flex items-center justify-between text-xs cursor-pointer transition ${
                            isChecked ? 'bg-teal-50 font-semibold text-teal-950' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-teal-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span>{r.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{r.boss_name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asunto <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Contenido:</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones adicionales:</label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="Notas aclaratorias opcionales..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || loadingData}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
