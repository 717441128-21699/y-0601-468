import JsBarcode from 'jsbarcode'
import { QRCodeSVG } from 'qrcode.react'

export function generateBarcodeSVG(code: string, options?: {
  width?: number
  height?: number
  displayValue?: boolean
  fontSize?: number
}): string {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, code, {
    format: 'CODE128',
    width: options?.width || 2,
    height: options?.height || 80,
    displayValue: options?.displayValue ?? true,
    fontSize: options?.fontSize || 14,
    margin: 10,
    background: '#ffffff',
    lineColor: '#1a2332'
  })
  return canvas.toDataURL('image/png')
}

export function printBarcode(code: string, traceCode: string): void {
  const printWindow = window.open('', '_blank', 'width=400,height=300')
  if (!printWindow) return

  const barcodeDataUrl = generateBarcodeSVG(code, { width: 3, height: 100 })

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>打印条码</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 20px;
          margin: 0;
        }
        .barcode-container {
          margin-bottom: 20px;
        }
        .barcode-img {
          max-width: 100%;
          height: auto;
        }
        .trace-code {
          font-size: 12px;
          color: #666;
          word-break: break-all;
          margin-top: 10px;
        }
        .title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="title">医疗废物追溯条码</div>
      <div class="barcode-container">
        <img class="barcode-img" src="${barcodeDataUrl}" alt="条码" />
      </div>
      <div class="trace-code">追溯码: ${traceCode}</div>
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()
  printWindow.onload = () => {
    printWindow.print()
    setTimeout(() => printWindow.close(), 500)
  }
}

export function validateBarcode(code: string): boolean {
  if (!code || code.length < 8) return false
  const pattern = /^[A-Z0-9]+$/
  return pattern.test(code)
}

export function parseTraceCode(traceCode: string): {
  institutionCode: string
  categoryCode: string
  date: string
  sequence: string
  checkDigit: string
} | null {
  const pattern = /^([A-Z0-9]{3,6})-([A-Z]{3})-(\d{8})-(\d{10})-(\d{5})$/
  const match = traceCode.match(pattern)

  if (!match) return null

  return {
    institutionCode: match[1],
    categoryCode: match[2],
    date: match[3],
    sequence: match[4],
    checkDigit: match[5]
  }
}

export { QRCodeSVG }
