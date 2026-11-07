import React, { useState } from 'react';
import { Product } from '../../types/index.ts';
import { X, Printer, Tag, Layers, Check } from 'lucide-react';

interface BarcodeLabelModalProps {
  product: Product | null;
  onClose: () => void;
}

// Generate simple deterministic Code-128/EAN-13 like SVG barcode bars
function SvgBarcode({ value, width = 220, height = 55 }: { value: string; width?: number; height?: number }) {
  // Hash characters to bar widths
  const cleanVal = (value || '7891234567890').replace(/[^0-9A-Za-z]/g, '');
  const bars: { width: number; isBlack: boolean }[] = [];

  // Guard bars
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  for (let i = 0; i < cleanVal.length; i++) {
    const charCode = cleanVal.charCodeAt(i);
    const pattern = [(charCode % 3) + 1, ((charCode * 3) % 4) + 1, ((charCode * 7) % 3) + 1, ((charCode * 5) % 4) + 1];
    pattern.forEach((w, idx) => {
      bars.push({ width: w, isBlack: idx % 2 === 0 });
    });
  }

  // End guards
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  const totalUnits = bars.reduce((acc, b) => acc + b.width, 0);
  const scale = width / totalUnits;

  let currentX = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        {bars.map((bar, i) => {
          const barW = bar.width * scale;
          const rect = bar.isBlack ? (
            <rect key={i} x={currentX} y={0} width={barW} height={height} fill="#000000" />
          ) : null;
          currentX += barW;
          return rect;
        })}
      </svg>
      <span className="font-mono text-xs tracking-widest text-slate-800 dark:text-slate-200 mt-1 font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ product, onClose }) => {
  const [labelType, setLabelType] = useState<'gondola' | 'thermal' | 'box'>('gondola');
  const [copies, setCopies] = useState<number>(4);
  const [includeDate, setIncludeDate] = useState<boolean>(true);
  const [batchNumber, setBatchNumber] = useState<string>('LOTE-PADRAO');

  if (!product) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden no-print">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#28B88C]/10 text-[#28B88C]">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Gerador de Etiquetas de Gôndola & Código de Barras</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Padrão ABNT / GS1 para impressão térmica e gôndolas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#24445F]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Modelo de Etiqueta
              </label>
              <select
                value={labelType}
                onChange={e => setLabelType(e.target.value as any)}
                className="w-full text-sm bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              >
                <option value="gondola">Gôndola Supermercado (100x35mm)</option>
                <option value="thermal">Térmica Adesiva (50x30mm)</option>
                <option value="box">Identificação de Caixa / Palete (100x70mm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Quantidade de Cópias
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={copies}
                onChange={e => setCopies(Math.max(1, Number(e.target.value)))}
                className="w-full text-sm bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Lote de Rastreio (Opcional)
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
                placeholder="Ex: LT-2026-X"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pré-visualização do Modelo Impresso
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Tamanho aproximado: {labelType === 'gondola' ? '100mm × 35mm' : labelType === 'thermal' ? '50mm × 30mm' : '100mm × 70mm'}
              </span>
            </div>

            <div className="bg-slate-100 dark:bg-[#0A121B] p-6 rounded-xl border border-dashed border-slate-300 dark:border-[#24445F] flex justify-center items-center">
              {labelType === 'gondola' && (
                <div className="w-[380px] bg-white text-black p-4 rounded shadow-md border-2 border-slate-900 flex flex-col justify-between select-none">
                  <div className="flex items-start justify-between border-b border-black pb-1 mb-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 block">ASSX SUPERMERCADOS</span>
                      <h4 className="text-sm font-black uppercase leading-tight line-clamp-2 max-w-[240px]">{product.name}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono block text-slate-600">CÓD: {product.code}</span>
                      <span className="text-[10px] font-bold block">{product.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between my-1">
                    <div className="scale-90 origin-left">
                      <SvgBarcode value={product.ean} width={180} height={40} />
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-semibold text-slate-700 block">PREÇO À VISTA</span>
                      <div className="flex items-baseline justify-end gap-0.5">
                        <span className="text-xs font-bold">R$</span>
                        <span className="text-2xl font-black font-mono tracking-tight tabular-nums">
                          {product.salePrice.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-300 pt-1 text-[9px] text-slate-500 font-mono">
                    <span>SKU: {product.sku}</span>
                    <span>LOTE: {batchNumber}</span>
                    <span>DATA: {new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              )}

              {labelType === 'thermal' && (
                <div className="w-[240px] bg-white text-black p-3 rounded shadow-md border border-black flex flex-col items-center justify-between text-center select-none">
                  <h4 className="text-xs font-bold leading-tight line-clamp-1 mb-1">{product.name}</h4>
                  <div className="scale-85 origin-center">
                    <SvgBarcode value={product.ean} width={160} height={35} />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1 font-mono">
                    <span className="text-[10px] font-bold">R$</span>
                    <span className="text-lg font-black">{product.salePrice.toFixed(2).replace('.', ',')}</span>
                    <span className="text-[9px]">/ {product.unit}</span>
                  </div>
                </div>
              )}

              {labelType === 'box' && (
                <div className="w-[420px] bg-white text-black p-5 rounded shadow-md border-2 border-black flex flex-col justify-between select-none">
                  <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
                    <span className="text-xs font-black tracking-wider">ASSX TECH LOGÍSTICA & ESTOQUE</span>
                    <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5 rounded">DEP-GERAL</span>
                  </div>
                  <h3 className="text-base font-black uppercase mb-1">{product.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2 bg-slate-50 p-2 border border-slate-300">
                    <div><strong>CÓDIGO:</strong> {product.code}</div>
                    <div><strong>SKU:</strong> {product.sku}</div>
                    <div><strong>EMBALAGEM:</strong> {product.packageType || 'CX PADRÃO'}</div>
                    <div><strong>UNIDADES:</strong> {product.unitsPerPackage || 1} {product.unit}</div>
                    <div><strong>LOTE:</strong> {batchNumber}</div>
                    <div><strong>DATA:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div className="flex justify-center mt-2">
                    <SvgBarcode value={product.ean} width={260} height={50} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-[#24445F] flex items-center justify-between bg-slate-50 dark:bg-[#1A2E44]/40">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {copies} {copies === 1 ? 'etiqueta será enviada' : 'etiquetas serão enviadas'} para impressão
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#24445F] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir Etiquetas
            </button>
          </div>
        </div>
      </div>

      {/* Hidden container specifically rendered when window.print() is triggered */}
      <div className="hidden print:block print-only fixed inset-0 bg-white p-4">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: copies }).map((_, index) => (
            <div key={index} className="border border-black p-3 page-break-inside-avoid">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 block">ASSX SUPERMERCADOS</span>
              <h4 className="text-sm font-black uppercase leading-tight line-clamp-2">{product.name}</h4>
              <div className="flex items-center justify-between my-2">
                <SvgBarcode value={product.ean} width={170} height={40} />
                <div className="text-right">
                  <span className="text-[9px] uppercase font-semibold block">PREÇO</span>
                  <span className="text-xl font-black font-mono">R$ {product.salePrice.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 font-mono border-t border-slate-300 pt-1">
                <span>CÓD: {product.code}</span>
                <span>LOTE: {batchNumber}</span>
                <span>{product.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
