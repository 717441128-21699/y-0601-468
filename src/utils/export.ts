import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { TransferOrder, WasteRecord, WasteStatistics, TransferOrderStatusLabel } from '@/types'
import { formatDateTime, formatWeight, formatDate } from './format'

export async function exportPDF(
  elementId: string,
  filename: string,
  options?: { orientation?: 'portrait' | 'landscape' }
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) return

  const orientation = options?.orientation || 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('医疗废物智慧管理系统', pageWidth / 2, 15, { align: 'center' })

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`生成时间: ${formatDateTime(new Date())}`, pageWidth / 2, 22, { align: 'center' })

  pdf.setLineWidth(0.5)
  pdf.line(10, 26, pageWidth - 10, 26)

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false
  })

  const imgData = canvas.toDataURL('image/png')
  const imgWidth = pageWidth - 20
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let yPos = 32
  const maxImgHeight = pageHeight - 40

  if (imgHeight > maxImgHeight) {
    const totalPages = Math.ceil(imgHeight / maxImgHeight)
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage()
        yPos = 10
      }

      const sourceY = (i * maxImgHeight * canvas.height) / imgHeight
      const sourceHeight = Math.min(maxImgHeight * (canvas.height / imgHeight), canvas.height - sourceY)

      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = canvas.width
      sourceCanvas.height = sourceHeight
      const ctx = sourceCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)
        const partImgData = sourceCanvas.toDataURL('image/png')
        const partHeight = (sourceHeight * imgWidth) / canvas.width
        pdf.addImage(partImgData, 'PNG', 10, yPos, imgWidth, partHeight)
      }
    }
  } else {
    pdf.addImage(imgData, 'PNG', 10, yPos, imgWidth, imgHeight)
  }

  pdf.setFontSize(8)
  pdf.setTextColor(128)
  pdf.text('第 1 页 / 共 1 页', pageWidth / 2, pageHeight - 10, { align: 'center' })

  pdf.save(`${filename}.pdf`)
}

export function exportTransferOrderToPDF(order: TransferOrder, wasteRecords: WasteRecord[]): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('医疗废物转移联单', pageWidth / 2, 20, { align: 'center' })

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`联单编号: ${order.orderNo}`, 20, 35)
  pdf.text(`生成时间: ${formatDateTime(order.createdAt)}`, 20, 42)
  pdf.text(`状态: ${TransferOrderStatusLabel[order.status]}`, 20, 49)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('一、基本信息', 20, 62)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const infoData = [
    ['申请时间', formatDateTime(order.applyTime)],
    ['申请单位', '医疗机构名称'],
    ['运输车辆', '车辆牌号'],
    ['驾驶员', '驾驶员姓名'],
    ['处置单位', '处置厂名称'],
    ['预计总重量', formatWeight(order.estimatedWeight)],
    ['实际总重量', order.totalWeight ? formatWeight(order.totalWeight) : '-'],
    ['审批状态', TransferOrderStatusLabel[order.status]],
    ['审批意见', order.auditOpinion || '-']
  ]

  infoData.forEach((row, index) => {
    pdf.text(row[0], 25, 72 + index * 7)
    pdf.text(row[1], 80, 72 + index * 7)
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('二、废物明细', 20, 140)

  const tableData = wasteRecords.map((record, index) => [
    index + 1,
    record.traceCode,
    '废物类别名称',
    formatWeight(record.weight),
    formatDateTime(record.createdAt)
  ])

  autoTable(pdf, {
    head: [['序号', '追溯码', '废物类别', '重量', '登记时间']],
    body: tableData,
    startY: 148,
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: 'bold'
    }
  })

  const finalY = (pdf as any).lastAutoTable.finalY + 15

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('三、签章', 20, finalY)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('移交人签字:', 25, finalY + 10)
  pdf.text('_______________', 25, finalY + 14)
  pdf.text('日期:', 25, finalY + 22)
  pdf.text('_______________', 25, finalY + 26)

  pdf.text('接收人签字:', 90, finalY + 10)
  pdf.text('_______________', 90, finalY + 14)
  pdf.text('日期:', 90, finalY + 22)
  pdf.text('_______________', 90, finalY + 26)

  pdf.text('监管人签字:', 155, finalY + 10)
  pdf.text('_______________', 155, finalY + 14)
  pdf.text('日期:', 155, finalY + 22)
  pdf.text('_______________', 155, finalY + 26)

  pdf.setFontSize(8)
  pdf.setTextColor(128)
  pdf.text('本联单由系统自动生成，具有同等法律效力', pageWidth / 2, 280, { align: 'center' })

  pdf.save(`转移联单_${order.orderNo}.pdf`)
}

export function exportMonthlyReportToExcel(statistics: WasteStatistics, month: string): void {
  const wb = XLSX.utils.book_new()

  const summaryData = [
    ['医疗废物月度运营报告', '', '', ''],
    [`统计月份: ${month}`, '', '', ''],
    [`生成时间: ${formatDateTime(new Date())}`, '', '', ''],
    ['', '', '', ''],
    ['指标', '数值', '单位', ''],
    ['废物总重量', statistics.totalWeight.toFixed(2), 'kg', ''],
    ['废物总袋数', statistics.totalCount, '袋', ''],
    ['', '', '', '']
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, '汇总')

  const categoryData = [
    ['废物类别统计'],
    ['废物类别', '重量(kg)', '数量(袋)', '占比(%)'],
    ...statistics.byCategory.map((item) => [
      item.categoryName,
      item.weight.toFixed(2),
      item.count,
      ((item.weight / statistics.totalWeight) * 100).toFixed(2)
    ])
  ]
  const categoryWs = XLSX.utils.aoa_to_sheet(categoryData)
  XLSX.utils.book_append_sheet(wb, categoryWs, '按类别统计')

  const institutionData = [
    ['医疗机构统计'],
    ['医疗机构', '重量(kg)', '数量(袋)', '占比(%)'],
    ...statistics.byInstitution.map((item) => [
      item.institutionName,
      item.weight.toFixed(2),
      item.count,
      ((item.weight / statistics.totalWeight) * 100).toFixed(2)
    ])
  ]
  const institutionWs = XLSX.utils.aoa_to_sheet(institutionData)
  XLSX.utils.book_append_sheet(wb, institutionWs, '按机构统计')

  const trendData = [
    ['每日趋势'],
    ['日期', '重量(kg)'],
    ...statistics.trendData.map((item) => [item.date, item.weight.toFixed(2)])
  ]
  const trendWs = XLSX.utils.aoa_to_sheet(trendData)
  XLSX.utils.book_append_sheet(wb, trendWs, '每日趋势')

  XLSX.writeFile(wb, `月度运营报告_${month}.xlsx`)
}

export function exportToExcel<T>(data: T[], filename: string, sheetName = 'Sheet1'): void {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function downloadCSV<T>(data: T[], filename: string): void {
  const headers = Object.keys(data[0] || {}).join(',')
  const rows = data.map((row) => Object.values(row).join(','))
  const csv = [headers, ...rows].join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function html2canvas(element: HTMLElement, options: any): Promise<HTMLCanvasElement> {
  const html2canvasModule = await import('html2canvas')
  return html2canvasModule.default(element, options)
}
