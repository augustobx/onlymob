import { getLatestICL } from '@/lib/bcra';
import { TrendingUp, Calendar, Bell } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export async function Header({ title, subtitle, actionButton }: HeaderProps) {
  const icl = await getLatestICL();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* BCRA ICL Badge Live */}
        <div className="hidden sm:flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 text-indigo-900 px-3 py-1.5 rounded-full text-xs font-semibold shadow-2xs">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          <span>ICL BCRA:</span>
          <span className="font-mono text-indigo-700 font-bold">{icl.valor.toFixed(2)}</span>
          <span className="text-[10px] text-slate-400 font-normal">({formatDate(icl.fecha)})</span>
        </div>

        {/* Action button if provided */}
        {actionButton && <div>{actionButton}</div>}
      </div>
    </header>
  );
}
