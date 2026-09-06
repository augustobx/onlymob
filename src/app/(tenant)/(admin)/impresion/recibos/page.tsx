import Link from 'next/link';
import { getMonthlyReceiptsAction } from '@/actions/debts-payments';
import { ReceiptPrintToolbar } from './receipt-print-toolbar';

export const dynamic = 'force-dynamic';

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function sentenceCase(value: string) {
  const text = value.trim().toLocaleLowerCase('es-AR');
  return text ? text.charAt(0).toLocaleUpperCase('es-AR') + text.slice(1) : text;
}

function money(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default async function MonthlyReceiptPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; porHoja?: string }>;
}) {
  const params = await searchParams;
  const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.mes || '') ? params.mes! : currentPeriod();
  const perPage = params.porHoja === '6' ? 6 : 8;
  const data = await getMonthlyReceiptsAction(period);
  const pages = chunks(data.receipts, perPage);

  return (
    <div className="receipt-print-root">
      <div className="no-print mx-auto mb-5 max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Impresión masiva</p>
            <h1 className="mt-1 text-xl font-black text-slate-950">Recibos del mes</h1>
            <p className="mt-1 text-sm text-slate-500">{data.receipts.length} recibo/s encontrados · A4 apaisado · {perPage} por hoja</p>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Mes</span>
              <input type="month" name="mes" defaultValue={period} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Por hoja</span>
              <select name="porHoja" defaultValue={String(perPage)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="8">8 recibos</option>
                <option value="6">6 recibos</option>
              </select>
            </label>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Ver</button>
            <ReceiptPrintToolbar />
            <Link href="/cobranzas" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Volver</Link>
          </form>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="no-print mx-auto max-w-3xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay pagos con recibo registrados en {period}.
        </div>
      ) : (
        <div className="receipt-pages">
          {pages.map((page, pageIndex) => (
            <section key={pageIndex} className={`receipt-sheet receipt-sheet--${perPage}`}>
              {page.map((receipt) => (
                <article key={receipt.id} className="compact-receipt">
                  <div className="compact-receipt__top">
                    <div className="compact-receipt__address">
                      <strong>Dirección:</strong>
                      <span>{receipt.address}</span>
                    </div>
                    <div className="compact-receipt__number">
                      <strong>Recibo N°</strong>
                      <span>{receipt.receiptNumber}</span>
                    </div>
                    <div className="compact-receipt__unit">
                      <strong>Dpto/Num.</strong>
                      <span>{receipt.unitLabel}</span>
                    </div>
                  </div>
                  <div className="compact-receipt__divider" />
                  <div className="compact-receipt__body">
                    <p><strong>Inquilino:</strong> {receipt.renterName}</p>
                    <p><strong>Monto en texto:</strong> {sentenceCase(receipt.amountWords)}</p>
                    <p><strong>Mes de pago:</strong> {receipt.paymentMonth}</p>
                  </div>
                  <div className="compact-receipt__amount">{money(receipt.amount)}</div>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}

      <style>{`
        .receipt-print-root{min-height:100vh;background:#f4f6fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#050505}
        .receipt-pages{display:flex;flex-direction:column;gap:18px;align-items:center}
        .receipt-sheet{box-sizing:border-box;width:297mm;min-height:210mm;background:white;padding:7mm;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:6mm;align-content:start;box-shadow:0 8px 30px rgba(15,23,42,.08)}
        .receipt-sheet--8{grid-template-rows:repeat(4,44mm);row-gap:4mm}
        .receipt-sheet--6{grid-template-rows:repeat(3,59mm);row-gap:4mm}
        .compact-receipt{box-sizing:border-box;border:1px solid #aeb3b8;border-radius:2px;padding:3.2mm 3.5mm 2.4mm;overflow:hidden;display:flex;flex-direction:column;font-size:9.5pt;line-height:1.14;background:#fff;break-inside:avoid}
        .compact-receipt__top{display:grid;grid-template-columns:minmax(0,1fr) 29mm 25mm;gap:4mm;align-items:start}
        .compact-receipt__top>div{min-width:0}
        .compact-receipt__top strong{display:block;font-size:8.7pt;line-height:1.05}
        .compact-receipt__top span{display:block;margin-top:.5mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .compact-receipt__number{text-align:center}
        .compact-receipt__unit{text-align:right}
        .compact-receipt__divider{border-top:1px dashed #c9cdd1;margin:1.6mm 0 1.5mm}
        .compact-receipt__body{display:grid;gap:1.1mm}
        .compact-receipt__body p{margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .compact-receipt__amount{margin-top:auto;text-align:center;font-size:12pt;font-weight:800;line-height:1;padding-top:1mm}
        @page{size:A4 landscape;margin:0}
        @media print{
          html,body{margin:0!important;padding:0!important;background:#fff!important}
          .admin-shell__sidebar,.app-sidebar,.mobile-nav,.no-print{display:none!important}
          .admin-shell,.admin-shell__content,main{display:block!important;margin:0!important;padding:0!important;width:100%!important;min-height:0!important}
          .receipt-print-root{padding:0!important;background:#fff!important}
          .receipt-pages{display:block!important}
          .receipt-sheet{width:297mm;height:210mm;min-height:210mm;padding:7mm;box-shadow:none;break-after:page;page-break-after:always}
          .receipt-sheet:last-child{break-after:auto;page-break-after:auto}
        }
      `}</style>
    </div>
  );
}
