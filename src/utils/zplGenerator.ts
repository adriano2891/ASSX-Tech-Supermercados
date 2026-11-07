import { LabelTemplate, Product } from '../types/index.ts';

/**
 * ASSX TECH SUPERMERCADOS — Gerador de ZPL II (Zebra Programming Language)
 * Gera comandos ZPL padrão industrial para impressoras térmicas Zebra, Argox, Elgin, etc.
 */
export function generateZplLabel(
  product: {
    name: string;
    sku: string;
    ean: string;
    salePrice: number;
    promoPrice?: number;
    unit?: string;
    brand?: string;
    lotNumber?: string;
    expirationDate?: string;
  },
  template: LabelTemplate,
  copies: number = 1
): string {
  // 203 DPI = 8 dots/mm. Width in dots:
  const widthDots = Math.round(template.widthMm * 8);
  const heightDots = Math.round(template.heightMm * 8);

  const cleanName = product.name.slice(0, 32).toUpperCase();
  const cleanPrice = (product.promoPrice !== undefined && product.promoPrice < product.salePrice)
    ? `R$ ${product.promoPrice.toFixed(2).replace('.', ',')}`
    : `R$ ${product.salePrice.toFixed(2).replace('.', ',')}`;

  const cleanEan = product.ean || '7891000000000';

  let zpl = `^XA\n`;
  zpl += `^PW${widthDots}\n`;
  zpl += `^LL${heightDots}\n`;
  zpl += `^LH0,0\n`;

  // Supermarket Name header
  if (template.elements.showStoreName) {
    zpl += `^FO30,20^A0N,20,20^FDASSX TECH SUPERMERCADOS^FS\n`;
  }

  // Product Name
  if (template.elements.showProductName) {
    zpl += `^FO30,48^A0N,26,24^FD${cleanName}^FS\n`;
  }

  // SKU and Unit
  if (template.elements.showSku) {
    zpl += `^FO30,80^A0N,18,18^FDSKU: ${product.sku} | UN: ${product.unit || 'UN'}^FS\n`;
  }

  // Barcode (EAN-13)
  if (template.elements.showBarcode) {
    zpl += `^FO30,110^BEN,50,Y,N^FD${cleanEan}^FS\n`;
  }

  // Price box
  if (template.elements.showPrice) {
    zpl += `^FO${widthDots - 180},80^A0N,40,36^FD${cleanPrice}^FS\n`;
  }

  // Print copies
  zpl += `^PQ${copies}\n`;
  zpl += `^XZ\n`;

  return zpl;
}

/**
 * Gera lote completo de comandos ZPL concatenados
 */
export function generateBatchZpl(
  items: { product: any; copies: number }[],
  template: LabelTemplate
): string {
  return items.map(item => generateZplLabel(item.product, template, item.copies)).join('\n');
}
