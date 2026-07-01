'use client'

import { useRef } from 'react'
import { Printer, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Voucher {
  id: string
  code: string
  durationMinutes: number
  maxUses: number | null
  usedCount: number | null
  expiresAt: Date | null
  createdAt: Date
}

interface VoucherPrintProps {
  vouchers: Voucher[]
  portalTitle: string
  ssid?: string
}

function formatDuration(minutes: number): string {
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)} dia(s)`
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h${minutes % 60 > 0 ? ` ${minutes % 60}min` : ''}`
  return `${minutes} min`
}

// Print cards layout - 8 cards per A4 page
function VoucherCards({ vouchers, portalTitle }: { vouchers: Voucher[]; portalTitle: string }) {
  return (
    <div className="print-cards">
      <style>{`
        .print-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 10mm;
        }
        .voucher-card {
          border: 2px dashed #333;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          page-break-inside: avoid;
        }
        .voucher-card .title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          color: #333;
        }
        .voucher-card .code {
          font-size: 28px;
          font-weight: 800;
          font-family: monospace;
          letter-spacing: 3px;
          margin-bottom: 8px;
          color: #000;
        }
        .voucher-card .info {
          font-size: 10px;
          color: #666;
          text-align: center;
        }
        .voucher-card .instructions {
          font-size: 9px;
          color: #888;
          margin-top: 8px;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 6px;
          width: 100%;
        }
        @media print {
          .print-cards {
            padding: 5mm;
            gap: 8px;
          }
          .voucher-card {
            min-height: 100px;
          }
        }
      `}</style>
      {vouchers.map((voucher) => (
        <div key={voucher.id} className="voucher-card">
          <div className="title">{portalTitle || 'WiFi'}</div>
          <div className="code">{voucher.code}</div>
          <div className="info">
            Duração: {formatDuration(voucher.durationMinutes)}
            {voucher.maxUses && voucher.maxUses > 1 ? ` · ${voucher.maxUses} usos` : ''}
          </div>
          <div className="instructions">
            Conecte ao WiFi → Selecione "Voucher" → Insira o código acima
          </div>
        </div>
      ))}
    </div>
  )
}

// Print list layout - table format
function VoucherList({ vouchers, portalTitle }: { vouchers: Voucher[]; portalTitle: string }) {
  return (
    <div className="print-list">
      <style>{`
        .print-list {
          padding: 10mm;
          font-family: sans-serif;
        }
        .print-list .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #333;
        }
        .print-list .header h1 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .print-list .header p {
          font-size: 12px;
          color: #666;
          margin: 4px 0 0;
        }
        .print-list table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .print-list th {
          background: #f5f5f5;
          padding: 8px 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #333;
        }
        .print-list td {
          padding: 6px 12px;
          border-bottom: 1px solid #ddd;
        }
        .print-list .code-cell {
          font-family: monospace;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
        }
        .print-list .footer {
          margin-top: 20px;
          font-size: 10px;
          color: #888;
          text-align: center;
        }
        @media print {
          .print-list {
            padding: 5mm;
          }
        }
      `}</style>
      <div className="header">
        <h1>{portalTitle || 'WiFi'} — Vouchers de Acesso</h1>
        <p>Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Código</th>
            <th>Duração</th>
            <th>Usos Máx.</th>
            <th>Validade</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((voucher, index) => (
            <tr key={voucher.id}>
              <td>{index + 1}</td>
              <td className="code-cell">{voucher.code}</td>
              <td>{formatDuration(voucher.durationMinutes)}</td>
              <td>{voucher.maxUses || 1}</td>
              <td>{voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString('pt-BR') : 'Sem validade'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="footer">
        Total: {vouchers.length} voucher(s) · Instrução: Conecte ao WiFi → Selecione "Voucher" → Insira o código
      </div>
    </div>
  )
}

// Main export component with print buttons
export function VoucherPrintButtons({ vouchers, portalTitle, ssid }: VoucherPrintProps) {
  const printCardsRef = useRef<HTMLDivElement>(null)
  const printListRef = useRef<HTMLDivElement>(null)

  const handlePrint = (type: 'cards' | 'list') => {
    const content = type === 'cards' ? printCardsRef.current : printListRef.current
    if (!content) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${portalTitle || 'WiFi'} - Vouchers</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, sans-serif; }
            @media print {
              @page { margin: 5mm; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Filter only unused/available vouchers for printing
  const availableVouchers = vouchers.filter(v => (v.usedCount || 0) < (v.maxUses || 1))

  if (availableVouchers.length === 0) return null

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handlePrint('cards')}
          className="text-muted-foreground hover:text-foreground"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Cartões
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handlePrint('list')}
          className="text-muted-foreground hover:text-foreground"
        >
          <FileText className="w-4 h-4 mr-2" />
          Imprimir Lista
        </Button>
      </div>

      {/* Hidden print content */}
      <div className="hidden">
        <div ref={printCardsRef}>
          <VoucherCards vouchers={availableVouchers} portalTitle={portalTitle} />
        </div>
        <div ref={printListRef}>
          <VoucherList vouchers={availableVouchers} portalTitle={portalTitle} />
        </div>
      </div>
    </>
  )
}
