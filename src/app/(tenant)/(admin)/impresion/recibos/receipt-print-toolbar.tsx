'use client';

import { Printer } from 'lucide-react';

export function ReceiptPrintToolbar() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
      <span className="inline-flex items-center gap-2"><Printer className="h-4 w-4" /> Imprimir</span>
    </button>
  );
}
