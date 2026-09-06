import { getLatestICL } from '@/lib/bcra';
import { TrendingUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { GlobalSearch } from '@/components/layout/global-search';
import { ModuleHelp } from '@/components/layout/module-help';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export async function Header({ title, subtitle, actionButton }: HeaderProps) {
  const icl = await getLatestICL();

  return (
    <header className="app-header">
      <div className="app-header__title">
        <p className="app-header__eyebrow">OnlyMob Workspace</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="app-header__tools">
        <div className="hidden md:block min-w-0 flex-1 max-w-xl"><GlobalSearch /></div>
        <div className="hidden xl:flex icl-badge" title="Índice para Contratos de Locación">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>ICL</span>
          <strong>{icl.valor.toFixed(2)}</strong>
          <small>{formatDate(icl.fecha)}</small>
        </div>
        <ModuleHelp title={title} />
        {actionButton && <div className="shrink-0">{actionButton}</div>}
      </div>
      <div className="md:hidden mt-4"><GlobalSearch /></div>
    </header>
  );
}
