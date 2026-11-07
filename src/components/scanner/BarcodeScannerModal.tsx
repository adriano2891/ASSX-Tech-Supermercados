import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, ScanLine, Search, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Product } from '../../types/index.ts';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedProduct, setDetectedProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setDetectedProduct(null);
      setManualCode('');
      setSearchFeedback(null);
    } else {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Câmera não suportada neste navegador.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);

        // Start scanning frames if BarcodeDetector is supported
        startFrameScanning();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Permissão de câmera não concedida ou dispositivo sem câmera. Utilize a busca manual ou leitor USB.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCameraActive(false);
  };

  const startFrameScanning = () => {
    // Check if BarcodeDetector API exists in browser
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'upc_a'],
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                handleCodeDetected(rawValue);
              }
            } catch (_) {}
          }
        }, 500);
      } catch (e) {
        console.warn('BarcodeDetector initialization warning:', e);
      }
    }
  };

  const handleCodeDetected = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setIsSearching(true);
    setSearchFeedback(null);
    try {
      const products = await api.getProducts({ q: clean });
      const exactMatch = products.find(p => p.ean === clean || p.code === clean || p.sku === clean) || products[0];

      if (exactMatch) {
        setDetectedProduct(exactMatch);
        setSearchFeedback(`Produto identificado: ${exactMatch.name}`);
        if (onSelectProduct) {
          onSelectProduct(exactMatch);
        }
      } else {
        setDetectedProduct(null);
        setSearchFeedback(`Nenhum produto cadastrado com o código "${clean}".`);
      }
    } catch (err) {
      setSearchFeedback('Erro ao consultar banco de dados.');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#28B88C]/15 text-[#28B88C]">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Leitor de Código de Barras</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Câmera, scanner óptico USB ou busca manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#24445F]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Camera View */}
        <div className="relative bg-black h-64 flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Overlay laser scan line */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-36 border-2 border-[#28B88C] rounded-lg pointer-events-none flex flex-col justify-between p-2 shadow-[0_0_15px_rgba(40,184,140,0.5)]">
                <div className="w-full h-0.5 bg-red-500 animate-pulse" />
                <span className="text-[11px] font-medium text-white/80 text-center bg-black/60 py-0.5 px-2 rounded">
                  Alinhe o código de barras no quadro
                </span>
                <div className="w-full h-0.5 bg-red-500 animate-pulse" />
              </div>
            </>
          ) : (
            <div className="text-center p-6 text-slate-400 max-w-xs">
              <Camera className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">{cameraError || 'Iniciando câmera...'}</p>
              {cameraError && (
                <button
                  onClick={startCamera}
                  className="mt-3 text-xs font-semibold text-[#28B88C] underline hover:text-[#229c76]"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}
        </div>

        {/* Manual search / USB scanner field */}
        <div className="p-5 space-y-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleCodeDetected(manualCode);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Digitar EAN, SKU ou passar leitor USB..."
                className="w-full text-sm pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !manualCode.trim()}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5"
            >
              Consultar
            </button>
          </form>

          {/* Quick preset supermarket barcodes for fast demo */}
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
            <span className="font-medium">Testar leitura rápida:</span>
            {[
              { label: 'Arroz Camil', ean: '7896006711124' },
              { label: 'Leite Piracanjuba', ean: '7898215150013' },
              { label: 'Heineken 350ml', ean: '7891991010832' },
              { label: 'Detergente Ypê', ean: '7896098900215' },
            ].map(item => (
              <button
                key={item.ean}
                type="button"
                onClick={() => {
                  setManualCode(item.ean);
                  handleCodeDetected(item.ean);
                }}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1A2E44] hover:bg-slate-200 dark:hover:bg-[#24445F] text-slate-700 dark:text-slate-300 font-mono text-[11px] transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Result Card */}
          {searchFeedback && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              detectedProduct
                ? 'bg-[#28B88C]/10 text-[#28B88C] border border-[#28B88C]/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {detectedProduct ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{searchFeedback}</span>
            </div>
          )}

          {detectedProduct && (
            <div className="bg-slate-50 dark:bg-[#1A2E44] p-4 rounded-xl border border-slate-200 dark:border-[#24445F] space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{detectedProduct.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    EAN: {detectedProduct.ean} · SKU: {detectedProduct.sku}
                  </p>
                </div>
                <span className="font-mono text-base font-black text-[#28B88C]">
                  R$ {detectedProduct.salePrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#24445F] text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  Estoque: <strong>{(detectedProduct as any).totalPhysicalStock || 0} {detectedProduct.unit}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectProduct) onSelectProduct(detectedProduct);
                    onClose();
                  }}
                  className="font-semibold text-[#28B88C] hover:text-[#229c76] flex items-center gap-1"
                >
                  Selecionar Produto <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
