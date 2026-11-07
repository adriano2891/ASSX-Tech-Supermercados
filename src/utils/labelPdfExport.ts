import { jsPDF } from 'jspdf';
import { LabelTemplate } from '../types/index.ts';
import { generateEan13BitString, ensureValidEan13 } from './barcodeGenerator.ts';

export interface LabelExportItem {
  id: string;
  name: string;
  sku: string;
  ean: string;
  salePrice: number;
  promoPrice?: number;
  unit: string;
  brand: string;
  categoryName?: string;
  lotNumber?: string;
  expirationDate?: string;
  copies: number;
}

/**
 * Gera e baixa documento PDF com as dimensões físicas exatas para impressão
 */
export async function exportLabelsToPdf(
  items: LabelExportItem[],
  template: LabelTemplate,
  storeName: string = 'ASSX TECH SUPERMERCADOS'
): Promise<Blob> {
  const widthMm = template.widthMm;
  const heightMm = template.heightMm;
  const orientation = widthMm >= heightMm ? 'l' : 'p';

  // Initialize jsPDF with custom page size matching the label format
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  // Flatten items by requested copies
  const allLabels: LabelExportItem[] = [];
  items.forEach(it => {
    for (let c = 0; c < (it.copies || 1); c++) {
      allLabels.push(it);
    }
  });

  if (allLabels.length === 0) {
    throw new Error('Nenhuma etiqueta para imprimir.');
  }

  allLabels.forEach((item, index) => {
    if (index > 0) {
      doc.addPage([widthMm, heightMm], orientation);
    }

    const padLeft = template.margins.left || 3;
    const padTop = template.margins.top || 3;
    const contentWidth = widthMm - (template.margins.left + template.margins.right);

    // Optional border
    if (template.elements.showBorder) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(1.5, 1.5, widthMm - 3, heightMm - 3);
    }

    let currentY = padTop + 2;

    // 1. Store Header
    if (template.elements.showStoreName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(template.widthMm >= 60 ? 7 : 5.5);
      doc.setTextColor(36, 68, 95); // Brand navy #24445F
      doc.text(storeName.toUpperCase(), padLeft, currentY);
      currentY += 3.5;
    }

    // 2. Product Name
    if (template.elements.showProductName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(template.widthMm >= 60 ? 9 : 7.5);
      doc.setTextColor(16, 29, 43); // Dark text

      // Split text to fit width
      const maxTextWidth = contentWidth;
      const lines = doc.splitTextToSize(item.name.toUpperCase(), maxTextWidth);
      doc.text(lines.slice(0, 2), padLeft, currentY);
      currentY += lines.slice(0, 2).length * 3.5;
    }

    // 3. Brand & SKU
    if (template.elements.showSku || template.elements.showBrand) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      const skuText = `SKU: ${item.sku} · ${item.unit || 'UN'}${item.brand ? ` · ${item.brand}` : ''}`;
      doc.text(skuText, padLeft, currentY);
      currentY += 3;
    }

    // 4. Promo or Regular Price
    const isPromo = item.promoPrice !== undefined && item.promoPrice > 0 && item.promoPrice < item.salePrice;

    if (template.elements.showPrice) {
      if (isPromo) {
        // Strike-through old price
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        const oldPriceStr = `De: R$ ${item.salePrice.toFixed(2).replace('.', ',')}`;
        doc.text(oldPriceStr, padLeft, currentY + 3);
        const oldPriceWidth = doc.getTextWidth(oldPriceStr);
        doc.line(padLeft, currentY + 2.2, padLeft + oldPriceWidth, currentY + 2.2);

        // Promo Price Highlight
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(template.widthMm >= 60 ? 15 : 12);
        doc.setTextColor(220, 38, 38); // Red promo
        const promoStr = `R$ ${item.promoPrice!.toFixed(2).replace('.', ',')}`;
        doc.text(promoStr, widthMm - padLeft - doc.getTextWidth(promoStr), currentY + 4);

        // Discount badge
        if (template.elements.showDiscountBadge) {
          const discountPct = Math.round(((item.salePrice - item.promoPrice!) / item.salePrice) * 100);
          doc.setFillColor(220, 38, 38);
          doc.rect(padLeft, currentY + 4, 14, 3.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(255, 255, 255);
          doc.text(`-${discountPct}%`, padLeft + 2, currentY + 6.5);
        }
        currentY += 8.5;
      } else {
        // Standard Price
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(template.widthMm >= 60 ? 14 : 11);
        doc.setTextColor(16, 29, 43);
        const priceStr = `R$ ${item.salePrice.toFixed(2).replace('.', ',')}`;
        doc.text(priceStr, padLeft, currentY + 4);
        currentY += 5.5;
      }
    }

    // 5. Barcode (EAN-13 / Code-128)
    if (template.elements.showBarcode) {
      const ean = item.ean || '7891000000000';
      const { bits, validEan } = generateEan13BitString(ean);

      const barcodeY = Math.max(currentY, heightMm - 11);
      const barcodeHeight = Math.min(6, heightMm - barcodeY - 3.5);
      const barcodeWidth = contentWidth * 0.85;
      const unitBarWidth = barcodeWidth / bits.length;
      const barcodeStartX = padLeft + (contentWidth - barcodeWidth) / 2;

      doc.setFillColor(0, 0, 0);
      for (let b = 0; b < bits.length; b++) {
        if (bits[b] === '1') {
          doc.rect(barcodeStartX + b * unitBarWidth, barcodeY, unitBarWidth, barcodeHeight, 'F');
        }
      }

      // Barcode numeric text
      if (template.elements.showBarcodeText) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(50, 50, 50);
        const eanWidth = doc.getTextWidth(validEan);
        doc.text(validEan, barcodeStartX + (barcodeWidth - eanWidth) / 2, barcodeY + barcodeHeight + 2.5);
      }
    }
  });

  return doc.output('blob');
}
