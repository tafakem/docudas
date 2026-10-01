import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Laptop, X, Share2, PlusSquare } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running in installed standalone app mode, don't show prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
        title="Instalar aplicación en PC, Celular o Tablet"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow or generic guide button
  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
        title="Instalar en Celular / Tablet / Desktop"
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Instalar en Dispositivo</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {isIOS ? (
                <div className="space-y-2 bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-blue-950">
                  <p className="font-bold flex items-center gap-1.5 text-sm">
                    <Share2 className="w-4 h-4 text-blue-600" />
                    Instrucciones para iPhone / iPad (Safari):
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed pl-1">
                    <li>Presione el botón <strong>Compartir</strong> (ícono con flecha hacia arriba).</li>
                    <li>Deslice hacia abajo en las opciones.</li>
                    <li>Seleccione <strong>"Agregar a inicio"</strong> (<PlusSquare className="inline w-3.5 h-3.5 text-blue-600" />).</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-800">
                  <p className="font-bold text-sm text-slate-900">Instrucciones para Android / Chrome / Edge:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed pl-1">
                    <li>Presione el menú de tres puntos (<strong>⋮</strong>) del navegador.</li>
                    <li>Seleccione <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
                    <li>Confirme la instalación para tener acceso directo y trabajar a pantalla completa.</li>
                  </ol>
                </div>
              )}

              <p className="text-[11px] text-slate-500 italic">
                * La aplicación se instalará directamente en su celular, tablet o computadora como una app nativa.
              </p>

              <button
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
