'use client';

import { useMemo, useState, useTransition } from 'react';
import { Download, FilePlus2, FileText, Link2, Plus, Search, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  generateDocumentFromTemplateAction,
  registerExternalDocumentAction,
  saveDocumentTemplateAction,
  setDocumentTemplateActiveAction,
} from '@/actions/documents';
import { DOCUMENT_TEMPLATE_VARIABLES } from '@/lib/document-template-variables';

type Tab = 'DOCUMENTS' | 'GENERATE' | 'REGISTER' | 'TEMPLATES';
type ContextType = 'PROPERTY' | 'CONTACT' | 'RENTER' | 'LEASE' | 'DEAL' | 'PAYMENT' | 'MAINTENANCE' | 'SETTLEMENT' | 'INSPECTION';

const CONTEXT_OPTIONS: Array<[ContextType, string]> = [
  ['PROPERTY', 'Propiedad'],
  ['CONTACT', 'Contacto / Propietario'],
  ['RENTER', 'Inquilino'],
  ['LEASE', 'Contrato'],
  ['DEAL', 'Operación'],
  ['PAYMENT', 'Pago'],
  ['MAINTENANCE', 'Mantenimiento'],
  ['SETTLEMENT', 'Liquidación'],
  ['INSPECTION', 'Inspección'],
];

function relationPayload(form: FormData) {
  return {
    propertyId: String(form.get('propertyId') || '') || null,
    contactId: String(form.get('contactId') || '') || null,
    renterId: String(form.get('renterId') || '') || null,
    propertyLeaseId: String(form.get('propertyLeaseId') || '') || null,
    dealId: String(form.get('dealId') || '') || null,
    paymentId: String(form.get('paymentId') || '') || null,
    maintenanceRequestId: String(form.get('maintenanceRequestId') || '') || null,
    ownerSettlementId: String(form.get('ownerSettlementId') || '') || null,
    inspectionId: String(form.get('inspectionId') || '') || null,
  };
}

export function DocumentCenterClient({ data }: { data: any }) {
  const [tab, setTab] = useState<Tab>('DOCUMENTS');
  const [search, setSearch] = useState('');
  const [contextType, setContextType] = useState<ContextType>('PROPERTY');
  const [registerContextType, setRegisterContextType] = useState<ContextType>('PROPERTY');
  const [templateBody, setTemplateBody] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const documents = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es-AR');
    if (!q) return data.documents;
    return data.documents.filter((document: any) =>
      [document.fileName, document.category, document.entityLabel, document.templateName, document.notes]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('es-AR').includes(q)),
    );
  }, [data.documents, search]);

  function run(task: () => Promise<any>, success?: (result: any) => void) {
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        const result = await task();
        success?.(result);
      } catch (err: any) {
        setError(err?.message || 'No se pudo completar la operación.');
      }
    });
  }

  function submitGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => generateDocumentFromTemplateAction({
        templateId: String(form.get('templateId') || ''),
        fileName: String(form.get('fileName') || '') || null,
        notes: String(form.get('notes') || '') || null,
        ...relationPayload(form),
      }),
      (result) => {
        setMessage('Documento generado correctamente.');
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => window.location.reload(), 400);
      },
    );
  }

  function submitRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => registerExternalDocumentAction({
        category: String(form.get('category') || ''),
        fileName: String(form.get('fileName') || ''),
        fileUrl: String(form.get('fileUrl') || ''),
        mimeType: String(form.get('mimeType') || '') || null,
        notes: String(form.get('notes') || '') || null,
        ...relationPayload(form),
      }),
      () => {
        setMessage('Documento registrado correctamente.');
        setTimeout(() => window.location.reload(), 350);
      },
    );
  }

  function submitTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => saveDocumentTemplateAction({
        id: editingTemplate?.id || null,
        name: String(form.get('name') || ''),
        category: String(form.get('category') || ''),
        description: String(form.get('description') || '') || null,
        body: templateBody,
        isActive: true,
      }),
      () => {
        setMessage(editingTemplate ? 'Plantilla actualizada.' : 'Plantilla creada.');
        setEditingTemplate(null);
        setTemplateBody('');
        setTimeout(() => window.location.reload(), 350);
      },
    );
  }

  function toggleTemplate(template: any) {
    run(() => setDocumentTemplateActiveAction(template.id, !Boolean(template.isActive)), () => window.location.reload());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex bg-slate-100 rounded-lg p-1 overflow-x-auto">
          <TabButton active={tab === 'DOCUMENTS'} onClick={() => setTab('DOCUMENTS')}>Repositorio</TabButton>
          <TabButton active={tab === 'GENERATE'} onClick={() => setTab('GENERATE')}>Generar</TabButton>
          <TabButton active={tab === 'REGISTER'} onClick={() => setTab('REGISTER')}>Registrar URL</TabButton>
          <TabButton active={tab === 'TEMPLATES'} onClick={() => setTab('TEMPLATES')}>Plantillas</TabButton>
        </div>
        <p className="text-xs text-slate-500">{data.documents.length} documentos · {data.templates.length} plantillas</p>
      </div>

      {error && <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-sm text-rose-700">{error}</div>}
      {message && <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50 text-sm text-emerald-700">{message}</div>}

      {tab === 'DOCUMENTS' && (
        <section className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar archivo, categoría, propiedad, persona o plantilla..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {documents.length === 0 ? (
              <Empty text="No hay documentos para mostrar." />
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((document: any) => (
                  <article key={document.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5" /></div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-sm text-slate-900 truncate">{document.fileName}</h3><Badge>{document.category}</Badge><Badge>{document.source === 'GENERATED' ? 'Generado' : 'Archivo'}</Badge></div>
                        <p className="text-xs text-slate-500 mt-1">{document.entityLabel || 'Documento general'}{document.templateName ? ` · Plantilla: ${document.templateName}` : ''}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{new Date(document.uploadedAt).toLocaleString('es-AR')}{document.notes ? ` · ${document.notes}` : ''}</p>
                      </div>
                    </div>
                    <a href={document.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 self-end md:self-auto">
                      <Download className="w-4 h-4" /> {document.source === 'GENERATED' ? 'Descargar PDF' : 'Abrir'}
                    </a>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'GENERATE' && (
        <form onSubmit={submitGenerate} className="card grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><h2 className="font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-600" />Generar desde plantilla</h2><p className="text-xs text-slate-500 mt-1">El contenido se resuelve con datos actuales y se guarda como snapshot para preservar el documento emitido.</p></div>
          <Select name="templateId" label="Plantilla *" options={data.templates.filter((template: any) => Boolean(template.isActive)).map((template: any) => [template.id, `${template.name} · ${template.category}`])} />
          <Field name="fileName" label="Nombre del archivo" placeholder="Ej: Resumen contrato Gómez" />
          <SelectValue label="Contexto principal" value={contextType} onChange={(value) => setContextType(value as ContextType)} options={CONTEXT_OPTIONS} />
          <ContextSelect type={contextType} data={data} />
          <Field name="notes" label="Notas internas" className="md:col-span-2" />
          <div className="md:col-span-2 flex justify-end"><button disabled={isPending || data.templates.length === 0} className="primary-btn"><Sparkles className="w-4 h-4" />Generar PDF</button></div>
        </form>
      )}

      {tab === 'REGISTER' && (
        <form onSubmit={submitRegister} className="card grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><h2 className="font-bold text-slate-900 flex items-center gap-2"><Link2 className="w-5 h-5 text-indigo-600" />Registrar documento existente</h2><p className="text-xs text-slate-500 mt-1">Para archivos ya guardados en R2, S3, Drive público u otro storage accesible por URL.</p></div>
          <Field name="fileName" label="Nombre del archivo *" required />
          <Field name="category" label="Categoría *" placeholder="CONTRATO, RECIBO, DNI..." required />
          <Field name="fileUrl" label="URL del archivo *" className="md:col-span-2" required />
          <Field name="mimeType" label="MIME type" placeholder="application/pdf" />
          <SelectValue label="Contexto principal" value={registerContextType} onChange={(value) => setRegisterContextType(value as ContextType)} options={CONTEXT_OPTIONS} />
          <ContextSelect type={registerContextType} data={data} />
          <Field name="notes" label="Notas" className="md:col-span-2" />
          <div className="md:col-span-2 flex justify-end"><button disabled={isPending} className="primary-btn"><FilePlus2 className="w-4 h-4" />Registrar</button></div>
        </form>
      )}

      {tab === 'TEMPLATES' && (
        <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-5 items-start">
          <form onSubmit={submitTemplate} className="card space-y-4">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{editingTemplate ? 'Editar plantilla' : 'Nueva plantilla'}</h2><p className="text-xs text-slate-500 mt-1">Usá variables dinámicas entre llaves dobles.</p></div>{editingTemplate && <button type="button" onClick={() => { setEditingTemplate(null); setTemplateBody(''); }} className="text-xs text-slate-500">Cancelar</button>}</div>
            <div className="grid sm:grid-cols-2 gap-3"><Field name="name" label="Nombre *" required defaultValue={editingTemplate?.name || ''} key={`name-${editingTemplate?.id || 'new'}`} /><Field name="category" label="Categoría *" required defaultValue={editingTemplate?.category || ''} key={`cat-${editingTemplate?.id || 'new'}`} /></div>
            <Field name="description" label="Descripción" defaultValue={editingTemplate?.description || ''} key={`desc-${editingTemplate?.id || 'new'}`} />
            <label><span className="label">Contenido *</span><textarea required value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} rows={16} className="input font-mono text-xs" placeholder={'Ejemplo:\nContrato entre {{tenant.name}} y {{renter.fullName}}...'} /></label>
            <div><p className="label">Variables disponibles</p><div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-100 rounded-lg">{DOCUMENT_TEMPLATE_VARIABLES.map((variable) => <button key={variable} type="button" onClick={() => setTemplateBody((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${variable}`)} className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-mono text-indigo-600 hover:bg-indigo-50">{variable}</button>)}</div></div>
            <div className="flex justify-end"><button disabled={isPending || !templateBody.trim()} className="primary-btn"><Plus className="w-4 h-4" />{editingTemplate ? 'Guardar cambios' : 'Crear plantilla'}</button></div>
          </form>

          <section className="card space-y-3">
            <h2 className="font-bold text-slate-900">Plantillas disponibles</h2>
            {data.templates.length === 0 ? <Empty text="Todavía no hay plantillas." /> : data.templates.map((template: any) => (
              <article key={template.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-sm">{template.name}</h3><Badge>{template.category}</Badge>{!Boolean(template.isActive) && <Badge>Inactiva</Badge>}</div><p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description || 'Sin descripción'}</p></div><button type="button" onClick={() => toggleTemplate(template)} className="p-1.5 text-slate-500" title={Boolean(template.isActive) ? 'Desactivar' : 'Activar'}>{Boolean(template.isActive) ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5" />}</button></div>
                <div className="mt-3 flex justify-end"><button type="button" onClick={() => { setEditingTemplate(template); setTemplateBody(template.body); }} className="text-xs font-semibold text-indigo-600">Editar</button></div>
              </article>
            ))}
          </section>
        </div>
      )}

      <style jsx>{`.card{background:white;border:1px solid #e2e8f0;border-radius:.75rem;padding:1.25rem}.primary-btn{display:inline-flex;align-items:center;gap:.45rem;background:#4f46e5;color:white;padding:.6rem .9rem;border-radius:.55rem;font-size:.8rem;font-weight:700}.primary-btn:disabled{opacity:.5}.label{display:block;font-size:.75rem;font-weight:600;color:#334155;margin-bottom:.3rem}.input{width:100%;padding:.55rem .75rem;border:1px solid #e2e8f0;border-radius:.55rem;font-size:.875rem;background:white}`}</style>
    </div>
  );
}

function ContextSelect({ type, data }: { type: ContextType; data: any }) {
  if (type === 'PROPERTY') return <Select name="propertyId" label="Propiedad *" options={data.properties.map((item: any) => [item.id, `${item.code} · ${item.address}`])} />;
  if (type === 'CONTACT') return <Select name="contactId" label="Contacto *" options={data.contacts.map((item: any) => [item.id, `${item.firstName} ${item.lastName}${item.documentNumber ? ` · ${item.documentNumber}` : ''}`])} />;
  if (type === 'RENTER') return <Select name="renterId" label="Inquilino *" options={data.renters.map((item: any) => [item.id, `${item.firstName} ${item.lastName} · DNI ${item.dni}`])} />;
  if (type === 'LEASE') return <Select name="propertyLeaseId" label="Contrato *" options={data.leases.map((item: any) => [item.id, `${item.property.code} · ${item.renter.firstName} ${item.renter.lastName}`])} />;
  if (type === 'DEAL') return <Select name="dealId" label="Operación *" options={data.deals.map((item: any) => [item.id, `${item.property.code} · ${item.operation} · ${item.status}`])} />;
  if (type === 'PAYMENT') return <Select name="paymentId" label="Pago *" options={data.payments.map((item: any) => [item.id, `${new Date(item.paidAt).toLocaleDateString('es-AR')} · ${item.debt.renter.firstName} ${item.debt.renter.lastName} · ${Number(item.amount).toLocaleString('es-AR')}`])} />;
  if (type === 'MAINTENANCE') return <Select name="maintenanceRequestId" label="Mantenimiento *" options={data.maintenance.map((item: any) => [item.id, `${item.property.code} · ${item.title}`])} />;
  if (type === 'SETTLEMENT') return <Select name="ownerSettlementId" label="Liquidación *" options={data.settlements.map((item: any) => [item.id, `${item.owner.firstName} ${item.owner.lastName} · ${new Date(item.periodEnd).toLocaleDateString('es-AR')}`])} />;
  return <Select name="inspectionId" label="Inspección *" options={data.inspections.map((item: any) => [item.id, `${item.property.code} · ${item.type} · ${item.status}`])} />;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap ${active ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}>{children}</button>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-semibold text-slate-600">{children}</span>; }
function Empty({ text }: { text: string }) { return <div className="py-10 text-center text-sm text-slate-400">{text}</div>; }
function Field({ name, label, required, placeholder, defaultValue, className = '' }: { name: string; label: string; required?: boolean; placeholder?: string; defaultValue?: string; className?: string }) { return <label className={className}><span className="label">{label}</span><input name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} className="input" /></label>; }
function Select({ name, label, options }: { name: string; label: string; options: any[] }) { return <label><span className="label">{label}</span><select name={name} required className="input bg-white"><option value="">Seleccionar...</option>{options.map((option: any) => <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></label>; }
function SelectValue({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) { return <label><span className="label">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="input bg-white">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
