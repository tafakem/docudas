import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DocType, Recipient } from '../types';
import {
  FilePlus2,
  Clock,
  Building,
  User,
  Calendar,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Info,
  ShieldCheck,
  CheckSquare,
  Square,
  Copy,
  Check
} from 'lucide-react';

interface Props {
  onSuccessNavigate?: (view: string) => void;
}

export const RegisterDocumentView: React.FC<Props> = ({ onSuccessNavigate }) => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split('T')[0];

  const [copied, setCopied] = useState<boolean>(false);

  const [docType, setDocType] = useState<DocType>('MEMORANDUM');
  const [year, setYear] = useState<number>(currentYear);
  const [date, setDate] = useState<string>(todayStr);
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [status, setStatus] = useState<string>('REGISTRADO');

  // Recipients
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [multipleRecipientIds, setMultipleRecipientIds] = useState<number[]>([]);

  // Reservation state
  const [reservation, setReservation] = useState<{
    reservationId: number;
    docType: string;
    year: number;
    number: number;
    formattedNumber: string;
    expiresAt: string;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [loadingReservation, setLoadingReservation] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ number: string; id: number } | null>(null);

  // Load recipients catalog
  useEffect(() => {
    api
      .getRecipients(false)
      .then(res => {
        setRecipients(res.recipients);
        if (res.recipients.length > 0) {
          setSelectedRecipientId(res.recipients[0].id.toString());
        }
      })
      .catch(err => setErrorMessage('Error al cargar catálogo de destinatarios'));
  }, []);

  // Reserve number whenever docType or year changes
  const reserveNumber = async (type: DocType, yr: number) => {
    setLoadingReservation(true);
    setErrorMessage(null);
    try {
      const res = await api.reserveNumber(type, yr);
      setReservation(res.reservation);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al reservar correlativo oficial');
    } finally {
      setLoadingReservation(false);
    }
  };

  // Initial reservation on component mount
  useEffect(() => {
    reserveNumber(docType, year);

    // On unmount, if reservation was not used, release it
    return () => {
      // Release is handled if user navigates away without submitting
    };
  }, []);

  // Handle changing document type: release old reservation first, then reserve for new type
  const handleDocTypeChange = async (newType: DocType) => {
    if (newType === docType) return;

    if (reservation) {
      try {
        await api.releaseNumber(
          reservation.reservationId,
          `Cambio de tipo de documento de ${docType} a ${newType}`
        );
      } catch (e) {
        // ignore error on release
      }
    }

    setDocType(newType);
    if (newType !== 'OFICIO_MULTIPLE') {
      setMultipleRecipientIds([]);
    } else {
      if (selectedRecipientId) {
        setMultipleRecipientIds([parseInt(selectedRecipientId)]);
      }
    }
    reserveNumber(newType, year);
  };

  // Explicit voluntary release button
  const handleVoluntaryRelease = async () => {
    if (!reservation) return;
    try {
      setLoadingReservation(true);
      const res = await api.releaseNumber(
        reservation.reservationId,
        'Liberación voluntaria solicitada por el usuario desde el formulario'
      );
      setReservation(null);
      setTimeLeft('');
      setErrorMessage(`El número ${res.formattedNumber} ha sido LIBERADO y devuelto a la secuencia.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al liberar número');
    } finally {
      setLoadingReservation(false);
    }
  };

  // Countdown timer for reservation expiration
  useEffect(() => {
    if (!reservation?.expiresAt) return;

    const timer = setInterval(() => {
      const diff = new Date(reservation.expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('EXPIRADA');
        clearInterval(timer);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [reservation?.expiresAt]);

  // Selected recipient for single mode
  const currentRecipient = recipients.find(r => r.id.toString() === selectedRecipientId);

  // Toggle recipient for OFICIO_MULTIPLE
  const handleToggleMultipleRecipient = (id: number) => {
    setMultipleRecipientIds(prev =>
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  // Submit registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!subject.trim()) {
      setErrorMessage('El asunto del documento es obligatorio.');
      return;
    }

    const recipientIdsToSubmit =
      docType === 'OFICIO_MULTIPLE'
        ? multipleRecipientIds
        : selectedRecipientId
        ? [parseInt(selectedRecipientId)]
        : [];

    if (recipientIdsToSubmit.length === 0) {
      setErrorMessage(
        docType === 'OFICIO_MULTIPLE'
          ? 'Debe seleccionar al menos un destinatario para el Oficio Múltiple.'
          : 'Debe seleccionar un destinatario.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.createDocument({
        reservationId: reservation?.reservationId,
        docType,
        year,
        date,
        subject: subject.trim(),
        description: description.trim(),
        observations: observations.trim(),
        recipientIds: recipientIdsToSubmit,
        status
      });

      setSuccessMessage({ number: res.formattedNumber, id: res.documentId });
      setReservation(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar el documento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setSuccessMessage(null);
    setSubject('');
    setDescription('');
    setObservations('');
    reserveNumber(docType, year);
  };

  if (successMessage) {
    const handleCopyNumber = () => {
      navigator.clipboard.writeText(successMessage.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    };

    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xl">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Documento Registrado con Éxito</h2>
        <div className="my-4 p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
            Número Oficial Asignado:
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-black text-blue-700 font-mono tracking-tight">
              {successMessage.number}
            </span>
            <button
              type="button"
              onClick={handleCopyNumber}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
              title="Copiar número al portapapeles"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copiar Número</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-600">
            El número correlativo ha quedado marcado como <strong>UTILIZADO</strong> y no se duplicará.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRegisterAnother}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Registrar Otro Documento
          </button>
          {onSuccessNavigate && (
            <button
              onClick={() => onSuccessNavigate('documents')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Ir a Control de Documentos
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-blue-600" />
            Registrar Documento Oficial
          </h2>
          <p className="text-xs text-slate-500">
            Asignación automática y bloqueo de correlativo con trazabilidad institucional.
          </p>
        </div>

        {/* Live Reservation Indicator Box */}
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3 shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Número Reservado en Concurrencia:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-blue-400">
                {loadingReservation ? 'Reservando...' : reservation?.formattedNumber || 'Sin reserva'}
              </span>
              {timeLeft && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {timeLeft}
                </span>
              )}
            </div>
          </div>

          {reservation && (
            <button
              type="button"
              onClick={handleVoluntaryRelease}
              title="Liberar número para otro usuario"
              className="text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 p-1.5 rounded transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Info Notice on Numbering Logic */}
      <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl p-3.5 text-xs text-blue-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>¿Por qué el número reservado puede diferir del último registrado?</strong>
          <p className="mt-0.5 text-slate-700">
            Si observa que el número asignado es por ejemplo el <strong>N° 15</strong> cuando en la lista sólo figura
            registrado hasta el <strong>N° 13</strong>, se debe a que otro operador o pestaña tiene una reserva temporal
            activa (ej: N° 14). Si ese operador cancela o cambia de tipo de documento, ese número (N° 14) volverá a estar{' '}
            <strong>DISPONIBLE</strong> y se reciclará para el siguiente registro de forma automática.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Row 1: Tipo de Documento */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Tipo de Documento Oficial:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'MEMORANDUM',
                title: 'MEMORÁNDUM',
                desc: 'Comunicación interna ejecutiva'
              },
              {
                id: 'OFICIO',
                title: 'OFICIO',
                desc: 'Comunicación oficial externa'
              },
              {
                id: 'OFICIO_MULTIPLE',
                title: 'OFICIO MÚLTIPLE',
                desc: 'Un número, múltiples destinatarios'
              }
            ].map(type => (
              <button
                type="button"
                key={type.id}
                onClick={() => handleDocTypeChange(type.id as DocType)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  docType === type.id
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">{type.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{type.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 italic">
            * Si cambia de tipo de documento, el número reservado anterior se libera automáticamente para que no se
            queme.
          </p>
        </div>

        {/* Row 2: Metadatos del Documento (Número, Año, Fecha, Estado) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Número Oficial Asignado:</label>
            <input
              type="text"
              readOnly
              value={reservation?.formattedNumber || 'Asignando...'}
              className="w-full bg-slate-200/80 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-600 mt-0.5 block">Protegido contra duplicidad</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Año de Gestión:</label>
            <input
              type="number"
              value={year}
              onChange={e => {
                const y = parseInt(e.target.value) || currentYear;
                setYear(y);
                reserveNumber(docType, y);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha del Documento:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Inicial:</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900"
            >
              <option value="REGISTRADO">REGISTRADO</option>
              <option value="BORRADOR">BORRADOR</option>
              <option value="ENVIADO">ENVIADO</option>
            </select>
          </div>
        </div>

        {/* Row 3: Destinatarios */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. Destinatario{docType === 'OFICIO_MULTIPLE' ? 's de la Comunicación' : ''}:
          </label>

          {docType !== 'OFICIO_MULTIPLE' ? (
            /* Single Recipient */
            <div className="space-y-3">
              <div>
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
              </div>

              {currentRecipient && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-600 block">Jefe / Responsable:</span>
                    <strong className="text-slate-900">{currentRecipient.boss_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Cargo Institucional:</span>
                    <span className="text-slate-700 font-medium">{currentRecipient.boss_position}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Multiple Recipients for OFICIO MÚLTIPLE (Section 10) */
            <div className="space-y-2">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5 text-xs text-teal-900">
                <strong>Regla de Oficio Múltiple:</strong> Se generará <strong>UN SOLO NÚMERO OFICIAL</strong> correlativo
                dirigido a las dependencias que marque a continuación.
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {recipients.map(r => {
                  const isChecked = multipleRecipientIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleToggleMultipleRecipient(r.id)}
                      className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                        isChecked ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-teal-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <span className="text-slate-900">{r.name}</span>
                          <span className="text-slate-600 ml-1.5 text-[11px]">({r.boss_name} — {r.boss_position})</span>
                        </div>
                      </div>
                      {r.acronym && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {r.acronym}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-right text-xs text-slate-500 font-medium">
                {multipleRecipientIds.length} dependencias seleccionadas
              </div>
            </div>
          )}
        </div>

        {/* Row 4: Asunto, Descripción y Observaciones */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Asunto del Documento <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ej: Remisión de informe técnico sobre ejecución de metas presupuestales..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Contenido:</label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle o resumen del contenido oficial del documento..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones / Referencias:</label>
            <textarea
              rows={2}
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Referencias adicionales, número de expediente, notas aclaratorias..."
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row 5: Usuario registrador (Locked) & Submit */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User className="w-4 h-4 text-slate-400" />
            <span>
              Usuario que registra: <strong className="text-slate-700 font-semibold">{user?.name}</strong> (Fijado
              automáticamente)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVoluntaryRelease}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar y Liberar Número
            </button>

            <button
              type="submit"
              disabled={submitting || !reservation}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Registrando...' : 'Registrar Documento Oficial'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
