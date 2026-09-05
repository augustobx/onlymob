import type { ReactNode } from 'react';

export function EntityHero({ eyebrow, title, subtitle, badges = [], actions, media }: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  badges?: Array<{ label: string; tone?: 'neutral'|'success'|'warning'|'danger'|'info' }>;
  actions?: ReactNode;
  media?: ReactNode;
}) {
  return (
    <section className="entity-hero">
      <div className="entity-hero__content">
        <div className="entity-hero__eyebrow">{eyebrow}</div>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div className="min-w-0">
            <h1 className="entity-hero__title">{title}</h1>
            {subtitle && <p className="entity-hero__subtitle">{subtitle}</p>}
            {badges.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{badges.map((badge, index) => <StatusPill key={`${badge.label}-${index}`} tone={badge.tone}>{badge.label}</StatusPill>)}</div>}
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
      {media && <div className="entity-hero__media">{media}</div>}
    </section>
  );
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode }) {
  return <div className="metric-card"><div className="flex items-start justify-between gap-4"><div><p className="metric-card__label">{label}</p><div className="metric-card__value">{value}</div>{detail && <div className="metric-card__detail">{detail}</div>}</div>{icon && <div className="metric-card__icon">{icon}</div>}</div></div>;
}

export function SectionCard({ title, subtitle, action, children, id }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return <section id={id} className="section-card scroll-mt-28"><div className="section-card__header"><div><h2 className="section-card__title">{title}</h2>{subtitle && <p className="section-card__subtitle">{subtitle}</p>}</div>{action}</div><div className="section-card__body">{children}</div></section>;
}

export function DetailGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return <dl className="detail-grid">{items.map((item) => <div key={item.label} className="detail-grid__item"><dt>{item.label}</dt><dd>{item.value ?? '—'}</dd></div>)}</dl>;
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral'|'success'|'warning'|'danger'|'info' }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function Timeline({ items }: { items: Array<{ id: string; title: string; detail?: string | null; date: string | Date; actor?: string | null; meta?: ReactNode }> }) {
  return <div className="timeline">{items.length ? items.map((item) => <article key={item.id} className="timeline__item"><div className="timeline__dot" /><div className="min-w-0"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"><p className="font-semibold text-slate-900">{item.title}</p><time className="text-xs text-slate-400 whitespace-nowrap">{new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.date))}</time></div>{item.detail && <p className="text-sm text-slate-600 mt-1">{item.detail}</p>}{item.actor && <p className="text-xs text-slate-400 mt-1">por {item.actor}</p>}{item.meta && <div className="mt-2">{item.meta}</div>}</div></article>) : <EmptyState>Sin actividad registrada todavía.</EmptyState>}</div>;
}

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className="table-shell"><table className="data-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}><EmptyState>Sin registros.</EmptyState></td></tr>}</tbody></table></div>;
}
