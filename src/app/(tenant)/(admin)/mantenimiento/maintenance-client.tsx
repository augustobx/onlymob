'use client';

import { useMemo, useState, useTransition } from 'react';
import { ClipboardCheck, HardHat, Plus, SearchCheck, ShieldCheck, Wrench } from 'lucide-react';
import {
  addInspectionFindingAction,
  createMaintenanceFromFindingAction,
  saveInspectionAction,
  saveMaintenanceRequestAction,
  saveProviderProfileAction,
  setMaintenanceStatusAction,
} from '@/actions/maintenance';

type Tab = 'ORDERS' | 'PROVIDERS' | 'INSPECTIONS';

export function MaintenanceClient({ data }: { data: any }) {
  const [tab, setTab] = useState<Tab>('ORDERS');
  const [showForm, setShowForm] = useState(false);
  const [findingInspectionId, setFindingInspectionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const openOrders = data.requests.filter((r: any) => !['RESOLVED', 'CANCELED'].includes(r.status)).length;
  const urgentOrders = data.requests.filter((r: any) => r.priority === 'URGENT' && !['RESOLVED', 'CANCELED'].includes(r.status)).length;
  const unresolvedFindings = data.inspections.flatMap((i: any) => i.findings).filter((f: any) => !f.resolved).length;

  function run(task: () => Promise<any>) {
    setError('');
    startTransition(async () => {
      try {
        await task();
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'No se pudo completar la operación.');
      }
    });
  }

  function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => saveMaintenanceRequestAction({
      propertyId: String(form.get('propertyId') || ''),
      propertyLeaseId: String(form.get('propertyLeaseId') || '') || null,
      renterId: String(form.get('renterId') || '') || null,
      providerContactId: String(form.get('providerContactId') || '') || null,
      assignedUserId: String(form.get('assignedUserId') || '') || null,
      category: String(form.get('category') || ''),
      priority: String(form.get('priority') || 'NORMAL') as any,
      title: String(form.get('title') || ''),
      description: String(form.get('description') || ''),
      reportedBy: String(form.get('reportedBy') || '') || null,
      quotedAmount: form.get('quotedAmount') ? Number(form.get('quotedAmount')) : null,
      approvedAmount: form.get('approvedAmount') ? Number(form.get('approvedAmount')) : null,
      actualCost: form.get('actualCost') ? Number(form.get('actualCost')) : null,
      costBearer: String(form.get('costBearer') || 'UNASSIGNED') as any,
      ownerApproved: form.get('ownerApproved') === 'on',
      scheduledAt: String(form.get('scheduledAt') || '') || null,
      promisedAt: String(form.get('promisedAt') || '') || null,
    }));
  }

  function submitProvider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const specialties = String(form.get('specialties') || '').split(',').map((v) => v.trim()).filter(Boolean);
    run(() => saveProviderProfileAction({
      contactId: String(form.get('contactId') || ''),
      specialties,
      rating: form.get('rating') ? Number(form.get('rating')) : null,
      insuranceInfo: String(form.get('insuranceInfo') || '') || null,
      notes: String(form.get('notes') || '') || null,
      isActive: true,
    }));
  }

  function submitInspection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checklist = String(form.get('checklist') || '').split('\n').map((v) => v.trim()).filter(Boolean);
    run(() => saveInspectionAction({
      propertyId: String(form.get('propertyId') || ''),
      propertyLeaseId: String(form.get('propertyLeaseId') || '') || null,
      renterId: String(form.get('renterId') || '') || null,
      inspectorUserId: String(form.get('inspectorUserId') || '') || null,
      type: String(form.get('type') || 'PERIODIC') as any,
      status: String(form.get('status') || 'SCHEDULED') as any,
      scheduledAt: String(form.get('scheduledAt') || '') || null,
      performedAt: String(form.get('performedAt') || '') || null,
      checklist,
      summary: String(form.get('summary') || '') || null,
    }));
  }

  function submitFinding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!findingInspectionId) return;
    run(() => addInspectionFindingAction({
      inspectionId: findingInspectionId,
      severity: String(form.get('severity') || 'MEDIUM') as any,
      area: String(form.get('area') || '') || null,
      description: String(form.get('description') || ''),
      photos: [],
    }));
  }

  const providers = useMemo(() => data.providers || [], [data.providers]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Metric icon={<Wrench className="w-5 h-5" />} label="Órdenes abiertas" value={openOrders} />
        <Metric icon={<HardHat className="w-5 h-5" />} label="Urgentes" value={urgentOrders} />
        <Metric icon={<SearchCheck className="w-5 h-5" />} label="Hallazgos pendientes" value={unresolvedFindings} />
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex bg-slate-100 rounded-lg p-1 overflow-x-auto">
          <TabButton active={tab === 'ORDERS'} onClick={() => { setTab('ORDERS'); setShowForm(false); }}>Órdenes</TabButton>
          <TabButton active={tab === 'PROVIDERS'} onClick={() => { setTab('PROVIDERS'); setShowForm(false); }}>Proveedores</TabButton>
          <TabButton active={tab === 'INSPECTIONS'} onClick={() => { setTab('INSPECTIONS'); setShowForm(false); }}>Inspecciones</TabButton>
        </div>
        <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">{error}</div>}

      {showForm && tab === 'ORDERS' && (
        <form onSubmit={submitOrder} className="card grid md:grid-cols-4 gap-3">
          <h2 className="md:col-span-4 font-bold">Nueva orden de mantenimiento</h2>
          <Select name="propertyId" label="Propiedad *" options={data.properties.map((p: any) => [p.id, `${p.code} · ${p.address}`])} />
          <Select name="propertyLeaseId" label="Contrato" options={[['', 'Sin contrato'], ...data.leases.map((l: any) => [l.id, `${l.property.code} · ${l.renter.firstName} ${l.renter.lastName}`])]} />
          <Select name="renterId" label="Inquilino" options={[['', 'Sin inquilino'], ...data.renters.map((r: any) => [r.id, `${r.firstName} ${r.lastName}`])]} />
          <Select name="providerContactId" label="Proveedor" options={[['', 'Sin asignar'], ...providers.map((p: any) => [p.id, providerName(p)])]} />
          <Field name="category" label="Categoría *" placeholder="Plomería, electricidad..." />
          <Select name="priority" label="Prioridad" options={[['LOW', 'Baja'], ['NORMAL', 'Normal'], ['HIGH', 'Alta'], ['URGENT', 'Urgente']]} />
          <Select name="assignedUserId" label="Responsable interno" options={[['', 'Sin asignar'], ...data.users.map((u: any) => [u.id, u.name])]} />
          <Select name="costBearer" label="Quién absorbe el costo" options={[['UNASSIGNED', 'Sin definir'], ['OWNER', 'Propietario'], ['RENTER', 'Inquilino'], ['TENANT', 'Inmobiliaria'], ['INSURANCE', 'Seguro']]} />
          <Field name="title" label="Título *" className="md:col-span-2" />
          <Field name="reportedBy" label="Reportado por" />
          <Field name="quotedAmount" label="Presupuesto" type="number" />
          <TextArea name="description" label="Descripción *" className="md:col-span-4" rows={4} />
          <Field name="approvedAmount" label="Importe aprobado" type="number" />
          <Field name="actualCost" label="Costo real" type="number" />
          <Field name="scheduledAt" label="Programado" type="datetime-local" />
          <Field name="promisedAt" label="Fecha prometida" type="datetime-local" />
          <label className="md:col-span-4 flex items-center gap-2 text-sm text-slate-700"><input name="ownerApproved" type="checkbox" /> Aprobado por propietario</label>
          <div className="md:col-span-4 flex justify-end"><button disabled={isPending} className="submit">Crear orden</button></div>
        </form>
      )}

      {showForm && tab === 'PROVIDERS' && (
        <form onSubmit={submitProvider} className="card grid md:grid-cols-3 gap-3">
          <h2 className="md:col-span-3 font-bold">Completar perfil de proveedor</h2>
          <Select name="contactId" label="Contacto proveedor *" options={providers.map((p: any) => [p.id, providerName(p)])} />
          <Field name="specialties" label="Rubros" placeholder="Plomería, gas, pintura" />
          <Field name="rating" label="Valoración 0 a 5" type="number" />
          <Field name="insuranceInfo" label="Seguro / matrícula" className="md:col-span-2" />
          <Field name="notes" label="Notas" />
          <div className="md:col-span-3 text-xs text-slate-500">Los nuevos proveedores se crean primero en Contactos con rol Proveedor; acá se completa su ficha operativa.</div>
          <div className="md:col-span-3 flex justify-end"><button disabled={isPending || providers.length === 0} className="submit">Guardar proveedor</button></div>
        </form>
      )}

      {showForm && tab === 'INSPECTIONS' && (
        <form onSubmit={submitInspection} className="card grid md:grid-cols-4 gap-3">
          <h2 className="md:col-span-4 font-bold">Nueva inspección</h2>
          <Select name="propertyId" label="Propiedad *" options={data.properties.map((p: any) => [p.id, `${p.code} · ${p.address}`])} />
          <Select name="propertyLeaseId" label="Contrato" options={[['', 'Sin contrato'], ...data.leases.map((l: any) => [l.id, `${l.property.code} · ${l.renter.firstName} ${l.renter.lastName}`])]} />
          <Select name="renterId" label="Inquilino" options={[['', 'Sin inquilino'], ...data.renters.map((r: any) => [r.id, `${r.firstName} ${r.lastName}`])]} />
          <Select name="inspectorUserId" label="Inspector" options={[['', 'Sin asignar'], ...data.users.map((u: any) => [u.id, u.name])]} />
          <Select name="type" label="Tipo" options={[['ENTRY', 'Ingreso'], ['EXIT', 'Egreso'], ['PERIODIC', 'Periódica'], ['OTHER', 'Otra']]} />
          <Select name="status" label="Estado" options={[['DRAFT', 'Borrador'], ['SCHEDULED', 'Programada'], ['IN_PROGRESS', 'En curso'], ['COMPLETED', 'Completada']]} />
          <Field name="scheduledAt" label="Programada" type="datetime-local" />
          <Field name="performedAt" label="Realizada" type="datetime-local" />
          <TextArea name="checklist" label="Checklist — un punto por línea" className="md:col-span-2" rows={5} />
          <TextArea name="summary" label="Resumen" className="md:col-span-2" rows={5} />
          <div className="md:col-span-4 flex justify-end"><button disabled={isPending} className="submit">Guardar inspección</button></div>
        </form>
      )}

      {tab === 'ORDERS' && (
        <div className="grid xl:grid-cols-2 gap-4">
          {data.requests.map((request: any) => (
            <article key={request.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{request.title}</h3><Status value={request.status} /><Priority value={request.priority} /></div>
                  <p className="text-xs text-slate-500 mt-1">{request.property.code} · {request.property.address}</p>
                </div>
                <div className="text-right text-xs text-slate-500">{new Date(request.updatedAt).toLocaleDateString('es-AR')}</div>
              </div>
              <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{request.description}</p>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-4 text-xs text-slate-600">
                <p><b>Categoría:</b> {request.category}</p>
                <p><b>Proveedor:</b> {request.provider ? providerName(request.provider) : 'Sin asignar'}</p>
                <p><b>Responsable:</b> {request.assignedUser?.name || 'Sin asignar'}</p>
                <p><b>Costo:</b> {money(request.actualCost ?? request.approvedAmount ?? request.quotedAmount)}</p>
                <p><b>Absorbe:</b> {request.costBearer}</p>
                <p><b>Inquilino:</b> {request.renter ? `${request.renter.firstName} ${request.renter.lastName}` : '-'}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {request.status === 'OPEN' && <Small onClick={() => run(() => setMaintenanceStatusAction(request.id, 'TRIAGED'))}>Clasificar</Small>}
                {request.status === 'TRIAGED' && <Small onClick={() => run(() => setMaintenanceStatusAction(request.id, 'QUOTED'))}>Presupuestada</Small>}
                {['TRIAGED', 'QUOTED'].includes(request.status) && <Small onClick={() => run(() => setMaintenanceStatusAction(request.id, 'APPROVED'))}>Aprobar</Small>}
                {['APPROVED', 'WAITING_PARTS'].includes(request.status) && <Small primary onClick={() => run(() => setMaintenanceStatusAction(request.id, 'IN_PROGRESS'))}>Iniciar trabajo</Small>}
                {request.status === 'IN_PROGRESS' && <Small onClick={() => run(() => setMaintenanceStatusAction(request.id, 'WAITING_PARTS'))}>Esperando repuesto</Small>}
                {['APPROVED', 'IN_PROGRESS', 'WAITING_PARTS'].includes(request.status) && <Small primary onClick={() => run(() => setMaintenanceStatusAction(request.id, 'RESOLVED'))}>Resolver</Small>}
                {!['RESOLVED', 'CANCELED'].includes(request.status) && <Small danger onClick={() => run(() => setMaintenanceStatusAction(request.id, 'CANCELED'))}>Cancelar</Small>}
              </div>
              {request.events?.length > 0 && <div className="mt-4 border-t pt-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Últimos movimientos</p>{request.events.slice(0, 3).map((event: any) => <p key={event.id} className="text-xs text-slate-500 mb-1">{event.actor?.name || 'Sistema'} · {event.fromStatus ? `${event.fromStatus} → ` : ''}{event.toStatus || 'nota'}{event.note ? ` · ${event.note}` : ''}</p>)}</div>}
            </article>
          ))}
          {data.requests.length === 0 && <Empty text="Todavía no hay órdenes de mantenimiento." />}
        </div>
      )}

      {tab === 'PROVIDERS' && (
        <div className="grid lg:grid-cols-3 gap-4">
          {providers.map((provider: any) => (
            <article key={provider.id} className="card">
              <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{providerName(provider)}</h3>{provider.providerProfile?.isActive !== false && <ShieldCheck className="w-4 h-4 text-emerald-600" />}</div>
              <p className="text-xs text-slate-500 mt-1">{provider.phone || 'Sin teléfono'} · {provider.email || 'Sin email'}</p>
              <p className="text-sm mt-3">{Array.isArray(provider.providerProfile?.specialties) && provider.providerProfile.specialties.length ? provider.providerProfile.specialties.join(' · ') : 'Rubros sin definir'}</p>
              <div className="mt-3 text-xs text-slate-500"><p>Valoración: {provider.providerProfile?.rating ?? '-'}/5</p><p>{provider.providerProfile?.insuranceInfo || 'Sin matrícula/seguro cargado'}</p></div>
            </article>
          ))}
          {providers.length === 0 && <Empty text="Todavía no hay contactos con rol Proveedor." />}
        </div>
      )}

      {tab === 'INSPECTIONS' && (
        <div className="space-y-4">
          {data.inspections.map((inspection: any) => (
            <article key={inspection.id} className="card">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div><div className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-indigo-600" /><h3 className="font-bold">{inspection.type} · {inspection.property.code}</h3><Status value={inspection.status} /></div><p className="text-xs text-slate-500 mt-1">{inspection.property.address} · {inspection.inspector?.name || 'Sin inspector'}</p></div>
                <button onClick={() => setFindingInspectionId(findingInspectionId === inspection.id ? null : inspection.id)} className="small">Registrar hallazgo</button>
              </div>
              {inspection.summary && <p className="text-sm mt-3 text-slate-700">{inspection.summary}</p>}
              {findingInspectionId === inspection.id && (
                <form onSubmit={submitFinding} className="mt-4 grid md:grid-cols-4 gap-3 rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <Select name="severity" label="Severidad" options={[['INFO', 'Informativo'], ['LOW', 'Baja'], ['MEDIUM', 'Media'], ['HIGH', 'Alta'], ['CRITICAL', 'Crítica']]} />
                  <Field name="area" label="Sector" placeholder="Baño, cocina..." />
                  <Field name="description" label="Hallazgo *" className="md:col-span-2" />
                  <div className="md:col-span-4 flex justify-end"><button disabled={isPending} className="submit">Agregar hallazgo</button></div>
                </form>
              )}
              <div className="mt-4 space-y-2">
                {inspection.findings.map((finding: any) => (
                  <div key={finding.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-lg p-3">
                    <div><div className="flex items-center gap-2"><Priority value={finding.severity} /><span className="text-xs font-semibold">{finding.area || 'General'}</span></div><p className="text-sm mt-1">{finding.description}</p>{finding.maintenanceRequest && <p className="text-xs text-indigo-600 mt-1">Orden: {finding.maintenanceRequest.title} · {finding.maintenanceRequest.status}</p>}</div>
                    {!finding.maintenanceRequestId && <button onClick={() => run(() => createMaintenanceFromFindingAction(finding.id))} className="small primary">Crear orden</button>}
                  </div>
                ))}
                {inspection.findings.length === 0 && <p className="text-xs text-slate-400">Sin hallazgos registrados.</p>}
              </div>
            </article>
          ))}
          {data.inspections.length === 0 && <Empty text="Todavía no hay inspecciones." />}
        </div>
      )}

      <style jsx>{`.card{background:white;border:1px solid #e2e8f0;border-radius:.75rem;padding:1.25rem}.submit{background:#4f46e5;color:white;padding:.55rem 1rem;border-radius:.5rem;font-size:.8rem;font-weight:600}.small{display:inline-flex;align-items:center;gap:.3rem;padding:.4rem .65rem;border:1px solid #e2e8f0;border-radius:.45rem;font-size:.72rem;font-weight:600}.primary{background:#4f46e5;color:white;border-color:#4f46e5}.danger{color:#e11d48;border-color:#fecdd3}`}</style>
    </div>
  );
}

function providerName(provider: any) {
  return provider.companyName || `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Proveedor';
}

function money(value: number | null | undefined) {
  if (value == null) return '-';
  return `$ ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">{icon}</div><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap ${active ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}>{children}</button>;
}

function Field({ name, label, type = 'text', placeholder, className = '' }: { name: string; label: string; type?: string; placeholder?: string; className?: string }) {
  return <label className={className}><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><input name={name} type={type} placeholder={placeholder} step={type === 'number' ? '0.01' : undefined} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>;
}

function TextArea({ name, label, className = '', rows = 3 }: { name: string; label: string; className?: string; rows?: number }) {
  return <label className={className}><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><textarea name={name} rows={rows} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: any[] }) {
  return <label><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><select name={name} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">{options.map((option: any) => <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></label>;
}

function Status({ value }: { value: string }) {
  return <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-600">{value}</span>;
}

function Priority({ value }: { value: string }) {
  const urgent = ['URGENT', 'CRITICAL'].includes(value);
  const high = ['HIGH'].includes(value);
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${urgent ? 'bg-rose-100 text-rose-700' : high ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{value}</span>;
}

function Small({ children, onClick, primary = false, danger = false }: { children: React.ReactNode; onClick: () => void; primary?: boolean; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`small ${primary ? 'primary' : ''} ${danger ? 'danger' : ''}`}>{children}</button>;
}

function Empty({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-slate-400">{text}</div>;
}
