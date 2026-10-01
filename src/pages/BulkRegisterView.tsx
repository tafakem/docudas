import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Recipient, AuthorizationItem } from '../types';
import { BulkPreviewModal } from '../components/BulkPreviewModal';
import Papa from 'papaparse';
import {
  Layers,
  ShieldCheck,
  Building,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Upload,
  Info,
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  Check
} from 'lucide-react';

interface Props {
  onSuccessNavigate?: (view: string) => void;
}

export const BulkRegisterView: React.FC<Props> = ({ onSuccessNavigate }) => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Authorizations & Recipients catalogs
  const [authorizations, setAuthorizations] = useState<AuthorizationItem[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedAuthId, setSelectedAuthId] = useState<string>('');

  // Mode: SINGLE | EQUAL_PER_RECIPIENT | TOTAL_DISTRIBUTED
  const [mode, setMode] = useState<'SINGLE' | 'EQUAL_PER_RECIPIENT' | 'TOTAL_DISTRIBUTED'>('SINGLE');

  // Single recipient settings
  const [singleRecipientId, setSingleRecipientId] = useState<string>('');
  const [singleQty, setSingleQty] = useState<number>(10);

  // Equal per recipient settings
  const [equalRecipients, setEqualRecipients] = useState<number[]>([]);
  const [qtyPerRec, setQtyPerRec] = useState<number>(5);

  // Total distributed settings
  const [distributedItems, setDistributedItems] = useState<{ recipientId: number; qty: number }[]>([]);

  // General content
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Excel / CSV variable data
  const [variableRows, setVariableRows] = useState<
    Array<{ dni?: string; beneficiary?: string; amount?: string; concept?: string }>
  >([]);
  const [csvFileName, setCsvFileName] = useState<string>('');

  // Preview modal & generation state
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    lotCode: string;
    quantity: number;
    startNumber: string;
    endNumber: string;
    message: string;
  } | null>(null);

  // Load catalogs
  useEffect(() => {
    api
      .getAuthorizations('AUTORIZADA')
      .then(res => {
        setAuthorizations(res.authorizations);
        if (res.authorizations.length > 0) {
          setSelectedAuthId(res.authorizations[0].id.toString());
        }
      })
      .catch(() => {});

    api
      .getRecipients(false)
      .then(res => {
        setRecipients(res.recipients);
        if (res.recipients.length > 0) {
          setSingleRecipientId(res.recipients[0].id.toString());
          setEqualRecipients([res.recipients[0].id]);
          setDistributedItems([{ recipientId: res.recipients[0].id, qty: 5 }]);
        }
      })
      .catch(() => {});
  }, []);

  const selectedAuth = authorizations.find(a => a.id.toString() === selectedAuthId);

  // Calculate current grand total
  const calculateTotal = (): number => {
    if (variableRows.length > 0) {
      return variableRows.length;
    }
    if (mode === 'SINGLE') {
      return singleQty || 0;
    }
    if (mode === 'EQUAL_PER_RECIPIENT') {
      return (equalRecipients.length || 0) * (qtyPerRec || 0);
    }
    if (mode === 'TOTAL_DISTRIBUTED') {
      return distributedItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    }
    return 0;
  };

  const grandTotal = calculateTotal();

  // Handle CSV upload for variable data (payroll, stipends, etc.)
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        if (results.data && results.data.length > 0) {
          const rows = results.data.map((r: any) => ({
            dni: r.DNI || r.dni || r.Documento || '',
            beneficiary: r.Beneficiario || r.beneficiario || r.Nombre || '',
            amount: r.Monto || r.monto || r.Importe || '',
            concept: r.Concepto || r.concepto || r.Detalle || ''
          }));
          setVariableRows(rows);
          setSingleQty(rows.length);
        }
      },
      error: err => {
        setErrorMessage('Error al leer el archivo CSV: ' + err.message);
      }
    });
  };

  const handleClearCsv = () => {
    setVariableRows([]);
    setCsvFileName('');
  };

  // Preview request
  const handleOpenPreview = async () => {
    setErrorMessage(null);

    if (!selectedAuth) {
      setErrorMessage('Seleccione una autorización administrativa válida.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('El asunto de los documentos es obligatorio.');
      return;
    }

    if (grandTotal <= 0) {
      setErrorMessage('La cantidad de documentos debe ser mayor a cero.');
      return;
    }

    if (grandTotal > selectedAuth.available_qty) {
      setErrorMessage(
        `La cantidad solicitada (${grandTotal}) supera el saldo disponible de la autorización (${selectedAuth.available_qty}).`
      );
      return;
    }

    setPreviewLoading(true);

    try {
      const data = await api.previewBulk({
        authorizationId: selectedAuth.id,
        mode,
        singleRecipientId,
        recipientsList:
          mode === 'EQUAL_PER_RECIPIENT'
            ? equalRecipients
            : mode === 'TOTAL_DISTRIBUTED'
            ? distributedItems
            : undefined,
        qtyPerRecipient: qtyPerRec,
        totalQty: grandTotal
      });

      setPreviewData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al generar la vista previa');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Execute actual generation
  const handleConfirmGeneration = async () => {
    if (!selectedAuth) return;

    setGenerateLoading(true);
    setErrorMessage(null);

    try {
      const result = await api.generateBulk({
        authorizationId: selectedAuth.id,
        mode,
        singleRecipientId,
        recipientsList:
          mode === 'EQUAL_PER_RECIPIENT'
            ? equalRecipients
            : mode === 'TOTAL_DISTRIBUTED'
            ? distributedItems
            : undefined,
        qtyPerRecipient: qtyPerRec,
        totalQty: grandTotal,
        subject: subject.trim(),
        description: description.trim(),
        variableRows: variableRows.length > 0 ? variableRows : undefined
      });

      setPreviewData(null);
      setSuccessResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al ejecutar la generación masiva');
    } finally {
      setGenerateLoading(false);
    }
  };

  if (successResult) {
    const handleCopy = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 3000);
    };

    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xl">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Lote Masivo Generado Exitosamente</h2>
        <div className="my-5 p-5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <span className="text-slate-500 font-semibold block">Código de Lote:</span>
              <strong className="text-indigo-700 font-mono text-sm">{successResult.lotCode}</strong>
            </div>
            <button
              onClick={() => handleCopy(successResult.lotCode, 'LOTE')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
            >
              {copiedText === 'LOTE' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-blue-400" />}
              <span>{copiedText === 'LOTE' ? '¡Copiado!' : 'Copiar Lote'}</span>
            </button>
          </div>

          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500 font-semibold">Total Documentos Creados:</span>
            <span className="text-slate-900 font-bold">{successResult.quantity} memorándums individuales</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-slate-500 font-semibold block">Rango Correlativo Asignado:</span>
              <span className="font-mono font-bold text-blue-700 text-sm">
                {successResult.startNumber} al {successResult.endNumber}
              </span>
            </div>
            <button
              onClick={() => handleCopy(`${successResult.startNumber} al ${successResult.endNumber}`, 'RANGO')}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
            >
              {copiedText === 'RANGO' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
              <span>{copiedText === 'RANGO' ? '¡Copiado!' : 'Copiar Rango'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              setSuccessResult(null);
              setSubject('');
              setDescription('');
              setVariableRows([]);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Emitir Otro Lote
          </button>
          {onSuccessNavigate && (
            <button
              onClick={() => onSuccessNavigate('bulk-lots')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Ver Historial de Lotes
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Registro Masivo de Memorándums
        </h2>
        <p className="text-xs text-slate-500">
          Generación de lotes oficiales con números secuenciales independientes, vinculados a una autorización
          administrativa.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Step 1: Authorization Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              1. Autorización Administrativa de Respaldo:
            </label>
            <span className="text-[11px] text-slate-500">Obligatorio para operaciones masivas</span>
          </div>

          {authorizations.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              No existen autorizaciones en estado <strong>AUTORIZADA</strong> con saldo disponible. Debe registrar una
              autorización administrativa antes de emitir un lote.
            </div>
          ) : (
            <div className="space-y-2">
              <select
                value={selectedAuthId}
                onChange={e => setSelectedAuthId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                {authorizations.map(auth => (
                  <option key={auth.id} value={auth.id}>
                    {auth.code} — {auth.operation_type} — {auth.subject} (Saldo Disp: {auth.available_qty} docs)
                  </option>
                ))}
              </select>

              {selectedAuth && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Área Autorizadora:</span>
                    <strong className="text-slate-800">{selectedAuth.authorizing_area}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Responsable:</span>
                    <span className="text-slate-700 font-medium">{selectedAuth.authorizing_boss}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cuota Total Autorizada:</span>
                    <span className="text-slate-800 font-bold">{selectedAuth.authorized_qty} docs</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Saldo Disponible:</span>
                    <span className="text-emerald-700 font-black font-mono text-sm">
                      {selectedAuth.available_qty} documentos
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Recipient Selection & Mode */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-blue-600" />
            2. Modalidad de Destinatarios y Cantidad:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('SINGLE')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                mode === 'SINGLE'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="font-bold text-xs">UN SOLO DESTINATARIO (Predeterminado)</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Genera N memorándums dirigidos a la misma dirección (ej: 25 para Administración).
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('EQUAL_PER_RECIPIENT')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                mode !== 'SINGLE'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="font-bold text-xs">MÚLTIPLES DESTINATARIOS (Opcional)</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Distribuye memorándums entre varias direcciones y dependencias.
              </div>
            </button>
          </div>

          {/* Configuration sub-panel depending on mode */}
          {mode === 'SINGLE' ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destinatario:</label>
                <select
                  value={singleRecipientId}
                  onChange={e => setSingleRecipientId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                >
                  {recipients.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.acronym})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cantidad de Memorándums a Emitir:
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedAuth?.available_qty || 100}
                  value={singleQty}
                  onChange={e => setSingleQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Máximo permitido por autorización: {selectedAuth?.available_qty || 0}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === 'EQUAL_PER_RECIPIENT'}
                    onChange={() => setMode('EQUAL_PER_RECIPIENT')}
                  />
                  <span className="font-semibold">Modalidad A: Misma cantidad por destinatario</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === 'TOTAL_DISTRIBUTED'}
                    onChange={() => setMode('TOTAL_DISTRIBUTED')}
                  />
                  <span className="font-semibold">Modalidad B: Cantidad específica por destinatario</span>
                </label>
              </div>

              {mode === 'EQUAL_PER_RECIPIENT' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cantidad por cada destinatario:
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={qtyPerRec}
                        onChange={e => setQtyPerRec(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                      />
                    </div>
                    <div className="text-right flex items-end justify-end">
                      <span className="text-xs text-slate-600">
                        Cálculo total: {equalRecipients.length} áreas × {qtyPerRec} docs ={' '}
                        <strong className="text-indigo-700 font-bold">{equalRecipients.length * qtyPerRec} docs</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Marque las dependencias participantes:
                    </label>
                    <div className="border border-slate-200 rounded-lg bg-white p-2 max-h-40 overflow-y-auto space-y-1">
                      {recipients.map(r => (
                        <label key={r.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded text-xs">
                          <input
                            type="checkbox"
                            checked={equalRecipients.includes(r.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setEqualRecipients(prev => [...prev, r.id]);
                              } else {
                                setEqualRecipients(prev => prev.filter(id => id !== r.id));
                              }
                            }}
                          />
                          <span>
                            {r.name} ({r.acronym})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Modalidad B */
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Distribuya las cantidades por cada dependencia:
                  </span>
                  <div className="border border-slate-200 rounded-lg bg-white p-2 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {recipients.map(r => {
                      const item = distributedItems.find(d => d.recipientId === r.id);
                      const currentQ = item ? item.qty : 0;
                      return (
                        <div key={r.id} className="py-2 flex items-center justify-between text-xs gap-3">
                          <span className="truncate max-w-xs">{r.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-500">Cantidad:</span>
                            <input
                              type="number"
                              min="0"
                              value={currentQ}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setDistributedItems(prev => {
                                  const filtered = prev.filter(d => d.recipientId !== r.id);
                                  return val > 0 ? [...filtered, { recipientId: r.id, qty: val }] : filtered;
                                });
                              }}
                              className="w-16 border border-slate-300 rounded p-1 text-center font-bold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Optional Section: Excel / CSV Import (Section 33) */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              3. Carga Opcional de Datos Variables (Excel / CSV):
            </label>
            <span className="text-[11px] text-slate-500">Para planillas, pagos individualizados o DNI</span>
          </div>

          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">Cargar archivo CSV con datos variables por documento:</p>
                <p className="text-[11px] text-slate-500">
                  Columnas admitidas: <code>DNI, Beneficiario, Monto, Concepto</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  Seleccionar CSV
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                </label>

                {csvFileName && (
                  <button
                    type="button"
                    onClick={handleClearCsv}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    title="Quitar archivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {variableRows.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <span className="text-emerald-700 font-bold block mb-1">
                  ✓ {variableRows.length} registros cargados desde {csvFileName}
                </span>
                <div className="max-h-28 overflow-y-auto font-mono text-[11px] divide-y divide-slate-100">
                  {variableRows.slice(0, 5).map((row, idx) => (
                    <div key={idx} className="py-1 flex justify-between text-slate-600">
                      <span>
                        #{idx + 1} {row.beneficiary} ({row.dni})
                      </span>
                      <span className="font-bold text-slate-800">S/ {row.amount}</span>
                    </div>
                  ))}
                  {variableRows.length > 5 && (
                    <div className="py-1 text-slate-500 italic">... y {variableRows.length - 5} registros más</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Subject and Description */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            4. Asunto y Detalle Común del Lote:
          </label>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Asunto Oficial Común <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ej: Remisión de autorizaciones de pago correspondientes a servicios devengados..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Sustento Común:</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explicación del contenido aplicable a todo el lote..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Footer & Preview Button */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs">
            <span className="text-slate-500">Total de memorándums a emitir:</span>{' '}
            <strong className="text-indigo-700 font-black text-base ml-1">{grandTotal} documentos</strong>
          </div>

          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={previewLoading || grandTotal === 0}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {previewLoading ? (
              'Calculando correlativos...'
            ) : (
              <>
                <span>Vista Previa de Números Previstos</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewData && (
        <BulkPreviewModal
          authorization={previewData.authorization}
          grandTotal={previewData.grandTotal}
          startNumber={previewData.startNumber}
          endNumber={previewData.endNumber}
          previewItems={previewData.previewItems}
          subject={subject}
          description={description}
          loading={generateLoading}
          onConfirm={handleConfirmGeneration}
          onCancel={() => setPreviewData(null)}
        />
      )}
    </div>
  );
};
