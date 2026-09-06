import type { ReactNode } from 'react';

export function Workspace({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`app-page ui-workspace ${className}`}>{children}</div>;
}

export function WorkspaceContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`page-container ui-workspace__container ${className}`}>{children}</div>;
}

export function WorkspaceMetrics({ children }: { children: ReactNode }) {
  return <section className="ui-metrics">{children}</section>;
}

export function WorkspaceMetric({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode }) {
  return (
    <article className="metric-card ui-metric">
      <div className="ui-metric__copy">
        <p className="metric-card__label">{label}</p>
        <div className="metric-card__value">{value}</div>
        {detail ? <div className="metric-card__detail">{detail}</div> : null}
      </div>
      {icon ? <div className="metric-card__icon">{icon}</div> : null}
    </article>
  );
}

export function WorkspaceToolbar({ children }: { children: ReactNode }) {
  return <section className="ui-toolbar">{children}</section>;
}

export function WorkspaceTabs({ children }: { children: ReactNode }) {
  return <div className="ui-tabs" role="tablist">{children}</div>;
}

export function WorkspaceTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`ui-tab ${active ? 'is-active' : ''}`}>{children}</button>;
}

export function WorkspacePanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`section-card ${className}`}>{children}</section>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="ui-empty"><strong>{title}</strong>{description ? <p>{description}</p> : null}</div>;
}

export function Drawer({ open, title, subtitle, children, onClose, width = 'wide' }: { open: boolean; title: string; subtitle?: string; children: ReactNode; onClose: () => void; width?: 'normal' | 'wide' }) {
  if (!open) return null;
  return (
    <div className="ui-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <aside className={`ui-drawer ${width === 'wide' ? 'ui-drawer--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="ui-drawer__header">
          <div className="min-w-0"><p className="ui-drawer__eyebrow">OnlyMob</p><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
          <button type="button" onClick={onClose} className="ui-drawer__close" aria-label="Cerrar">×</button>
        </header>
        <div className="ui-drawer__body">{children}</div>
      </aside>
    </div>
  );
}

export function FormSection({ title, description, children, className = '' }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`ui-form-section ${className}`}>
      <div className="ui-form-section__heading"><h3>{title}</h3>{description ? <p>{description}</p> : null}</div>
      <div className="ui-form-section__body">{children}</div>
    </section>
  );
}
