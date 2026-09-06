import type { ReactNode } from 'react';

export function ModuleShell({ children }: { children: ReactNode }) {
  return <div className="app-page"><div className="page-container flex flex-col gap-5">{children}</div></div>;
}

export function ModuleSection({ title, subtitle, action, children }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="section-card">{(title||subtitle||action)&&<div className="section-card__header"><div><h2 className="section-card__title">{title}</h2>{subtitle&&<p className="section-card__subtitle">{subtitle}</p>}</div>{action}</div>}<div className="section-card__body">{children}</div></section>;
}
