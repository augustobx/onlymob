'use client';

import { useMemo, useState, useTransition } from 'react';
import { ArrowRight, Building2, MessageSquarePlus, Plus, Target } from 'lucide-react';
import {
  addLeadInteractionAction,
  getDemandMatchesAction,
  moveLeadAction,
  recordPropertyInterestAction,
  saveDemandAction,
  saveLeadAction,
} from '@/actions/crm';
import { formatCurrency } from '@/lib/utils';
import { Drawer, EmptyState, FormSection, WorkspaceSearch, WorkspaceTab, WorkspaceTabs, WorkspaceToolbar } from '@/components/ui/workspace';

const PIPELINE = [
  ['NEW','Nuevo'],['CONTACTED','Contactado'],['QUALIFIED','Calificado'],['PROPERTIES_SENT','Propiedades enviadas'],['VISIT_SCHEDULED','Visita agendada'],['VISITED','Visitó'],['NEGOTIATION','Negociación'],['RESERVATION','Reserva'],['WON','Ganado'],['LOST','Perdido'],
] as const;
const PRIORITIES = [['LOW','Baja'],['NORMAL','Normal'],['HIGH','Alta'],['URGENT','Urgente']] as const;

export function CrmClient({ data }: { data: any }) {
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [detailTab, setDetailTab] = useState<'SUMMARY'|'INTERACTION'|'DEMAND'>('SUMMARY');
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.leads;
    return data.leads.filter((lead: any) => [lead.title, lead.contact?.firstName, lead.contact?.lastName, lead.contact?.phone, lead.contact?.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [data.leads, search]);

  const totals = useMemo(() => ({
    active: leads.filter((lead:any)=>!['WON','LOST'].includes(lead.status)).length,
    urgent: leads.filter((lead:any)=>lead.priority==='URGENT').length,
    visits: leads.filter((lead:any)=>['VISIT_SCHEDULED','VISITED'].includes(lead.status)).length,
  }), [leads]);

  function run(task: () => Promise<any>, after?: (result: any) => void) {
    setError('');
    startTransition(async () => {
      try { const result = await task(); after?.(result); }
      catch (err: any) { setError(err?.message || 'No se pudo completar la operación.'); }
    });
  }

  function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    run(() => saveLeadAction({
      contactId: String(f.get('contactId') || ''), agentId: String(f.get('agentId') || '') || null,
      title: String(f.get('title') || ''), source: String(f.get('source') || ''), channel: String(f.get('channel') || ''),
      priority: String(f.get('priority') || 'NORMAL') as any, score: f.get('score') ? Number(f.get('score')) : null,
      status: 'NEW', notes: String(f.get('notes') || ''), nextStep: String(f.get('nextStep') || ''), nextActionAt: String(f.get('nextActionAt') || '') || null,
    }), () => { setShowLeadForm(false); window.location.reload(); });
  }

  function submitInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selectedLead) return; const f = new FormData(e.currentTarget);
    run(() => addLeadInteractionAction({ leadId: selectedLead.id, type: String(f.get('type')) as any, summary: String(f.get('summary') || ''), nextStep: String(f.get('nextStep') || '') }), () => window.location.reload());
  }

  function submitDemand(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selectedLead) return; const f = new FormData(e.currentTarget);
    const zones = String(f.get('zones') || '').split(',').map((x) => x.trim()).filter(Boolean);
    run(() => saveDemandAction({ leadId: selectedLead.id, contactId: selectedLead.contactId, operation: String(f.get('operation')) as any, propertyType: String(f.get('propertyType') || '') as any || null, zones, budgetMin: f.get('budgetMin') ? Number(f.get('budgetMin')) : null, budgetMax: f.get('budgetMax') ? Number(f.get('budgetMax')) : null, currency: String(f.get('currency') || 'ARS'), roomsMin: f.get('roomsMin') ? Number(f.get('roomsMin')) : null, bedroomsMin: f.get('bedroomsMin') ? Number(f.get('bedroomsMin')) : null, sqmMin: f.get('sqmMin') ? Number(f.get('sqmMin')) : null, amenities: [], notes: String(f.get('notes') || '') }), () => window.location.reload());
  }

  function loadMatches(demandId: string) { run(() => getDemandMatchesAction(demandId), (rows) => setMatches(rows)); }
  function openLead(lead:any){ setSelectedLead(lead); setMatches([]); setDetailTab('SUMMARY'); }

  return <div className="space-y-5">
    <div className="ui-summary-strip">
      <span className="ui-summary-chip"><strong>{leads.length}</strong> leads</span>
      <span className="ui-summary-chip"><strong>{totals.active}</strong> activos</span>
      <span className="ui-summary-chip"><strong>{totals.visits}</strong> en visitas</span>
      <span className="ui-summary-chip"><strong>{totals.urgent}</strong> urgentes</span>
    </div>

    <WorkspaceToolbar>
      <div className="ui-filter-row"><WorkspaceSearch value={search} onChange={setSearch} placeholder="Buscar lead, persona, teléfono..." /></div>
      <button onClick={()=>setShowLeadForm(true)} className="btn-primary"><Plus className="w-4 h-4"/>Nuevo lead</button>
    </WorkspaceToolbar>

    {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">{error}</div>}

    <div className="ui-kanban">
      {PIPELINE.map(([status,label]) => {
        const rows = leads.filter((lead:any)=>lead.status===status);
        return <section key={status} className="ui-kanban-column">
          <div className="ui-kanban-column__head"><h3>{label}</h3><span className="ui-kanban-column__count">{rows.length}</span></div>
          {rows.length===0 ? <div className="py-6 text-center text-[10px] text-slate-400">Sin leads</div> : rows.map((lead:any)=><button key={lead.id} onClick={()=>openLead(lead)} className="ui-kanban-card">
            <div className="flex justify-between gap-2"><h4>{lead.title}</h4><span className={`text-[9px] font-bold ${lead.priority==='URGENT'?'text-rose-600':lead.priority==='HIGH'?'text-amber-600':'text-slate-400'}`}>{lead.priority}</span></div>
            <p>{lead.contact.firstName} {lead.contact.lastName}</p>
            <p>{lead.agent?.name || 'Sin agente'} · {lead.source || 'Sin origen'}</p>
          </button>)}
        </section>;
      })}
    </div>

    <Drawer open={showLeadForm} onClose={()=>setShowLeadForm(false)} title="Nuevo lead" subtitle="Registrá lo esencial. El seguimiento y la demanda se completan desde la ficha del lead." width="wide">
      <form onSubmit={submitLead}>
        <FormSection title="Identificación" description="Persona, responsable y prioridad comercial.">
          <Select name="contactId" label="Contacto *" required options={data.contacts.map((c:any)=>[c.id, `${c.firstName} ${c.lastName}`])}/>
          <Select name="agentId" label="Agente" options={[['','Sin asignar'],...data.users.map((u:any)=>[u.id,u.name])]}/>
          <Field name="title" label="Título *" required placeholder="Ej. Busca depto 2 amb Palermo"/>
          <Select name="priority" label="Prioridad" options={PRIORITIES as any}/>
        </FormSection>
        <FormSection title="Origen y próximo paso">
          <Field name="source" label="Origen" placeholder="Instagram, referido, web..."/>
          <Field name="channel" label="Canal" placeholder="WhatsApp, teléfono..."/>
          <Field name="score" label="Score" type="number"/>
          <Field name="nextActionAt" label="Próxima acción" type="datetime-local"/>
          <Field name="nextStep" label="Próximo paso"/>
          <Field name="notes" label="Notas"/>
        </FormSection>
        <div className="ui-form-actions"><button type="button" onClick={()=>setShowLeadForm(false)} className="btn-secondary">Cancelar</button><button disabled={isPending} className="btn-primary">Guardar lead</button></div>
      </form>
    </Drawer>

    <Drawer open={!!selectedLead} onClose={()=>setSelectedLead(null)} title={selectedLead?.title || 'Lead'} subtitle={selectedLead ? `${selectedLead.contact.firstName} ${selectedLead.contact.lastName} · ${selectedLead.contact.phone || selectedLead.contact.email || 'sin contacto'}` : ''} width="wide">
      {selectedLead && <div className="space-y-5">
        <WorkspaceTabs>
          <WorkspaceTab active={detailTab==='SUMMARY'} onClick={()=>setDetailTab('SUMMARY')}>Resumen</WorkspaceTab>
          <WorkspaceTab active={detailTab==='INTERACTION'} onClick={()=>setDetailTab('INTERACTION')}><MessageSquarePlus className="inline w-3.5 h-3.5 mr-1"/>Interacción</WorkspaceTab>
          <WorkspaceTab active={detailTab==='DEMAND'} onClick={()=>setDetailTab('DEMAND')}><Target className="inline w-3.5 h-3.5 mr-1"/>Demanda</WorkspaceTab>
        </WorkspaceTabs>

        <FormSection title="Etapa comercial" description="Mové el lead por el pipeline sin salir de la ficha.">
          <div className="col-span-full flex flex-wrap gap-1.5">{PIPELINE.map(([s,l])=><button key={s} disabled={isPending||s===selectedLead.status} onClick={()=>run(()=>moveLeadAction(selectedLead.id,s as any),()=>window.location.reload())} className={`px-2.5 py-1.5 rounded-full text-[10px] font-semibold border ${s===selectedLead.status?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-600 border-slate-200'}`}>{l}</button>)}</div>
        </FormSection>

        {detailTab==='INTERACTION' && <form onSubmit={submitInteraction}><FormSection title="Registrar interacción"><Select name="type" label="Tipo" options={[['CALL','Llamada'],['WHATSAPP','WhatsApp'],['EMAIL','Email'],['MEETING','Reunión'],['NOTE','Nota'],['OTHER','Otro']]}/><Field name="summary" label="Resumen *" required/><Field name="nextStep" label="Próximo paso"/></FormSection><div className="flex justify-end"><button className="btn-primary">Registrar interacción</button></div></form>}

        {detailTab==='DEMAND' && <form onSubmit={submitDemand}><FormSection title="Demanda activa" description="Criterios de búsqueda para matching automático."><Select name="operation" label="Operación" options={[['RENT','Alquiler'],['SALE','Venta'],['TEMPORARY_RENT','Temporal'],['MANAGEMENT','Administración']]}/><Select name="propertyType" label="Tipo" options={[['','Todos'],['DEPARTAMENTO','Departamento'],['CASA','Casa'],['LOCAL','Local'],['TERRENO','Terreno'],['OFICINA','Oficina'],['COCHERA','Cochera'],['OTRO','Otro']]}/><Field name="zones" label="Zonas" placeholder="Palermo, Belgrano"/><Field name="currency" label="Moneda" defaultValue="ARS"/><Field name="budgetMin" label="Presupuesto mín." type="number"/><Field name="budgetMax" label="Presupuesto máx." type="number"/><Field name="roomsMin" label="Ambientes mín." type="number"/><Field name="bedroomsMin" label="Dormitorios mín." type="number"/><Field name="sqmMin" label="m² mín." type="number"/><Field name="notes" label="Notas"/></FormSection><div className="flex justify-end"><button className="btn-primary">Guardar demanda</button></div></form>}

        {detailTab==='SUMMARY' && <>
          <div className="grid lg:grid-cols-2 gap-4">
            <section className="section-card"><div className="section-card__header"><div><h3 className="section-card__title">Últimas interacciones</h3><p className="section-card__subtitle">Actividad comercial reciente</p></div></div><div className="section-card__body space-y-2">{selectedLead.interactions.length?selectedLead.interactions.map((i:any)=><div key={i.id} className="p-3 border border-slate-100 rounded-lg"><div className="text-[9px] font-bold text-indigo-600">{i.type}</div><p className="text-xs mt-1 text-slate-700">{i.summary}</p></div>):<EmptyState title="Sin interacciones" />}</div></section>
            <section className="section-card"><div className="section-card__header"><div><h3 className="section-card__title">Demandas activas</h3><p className="section-card__subtitle">Búsquedas vinculadas al lead</p></div></div><div className="section-card__body space-y-2">{selectedLead.demands.length?selectedLead.demands.map((d:any)=><div key={d.id} className="p-3 border border-slate-100 rounded-lg flex justify-between gap-3"><div><p className="text-xs font-semibold">{d.operation} · {d.propertyType || 'Cualquier tipo'}</p><p className="text-[10px] text-slate-500">{d.budgetMax?`Hasta ${formatCurrency(d.budgetMax,d.currency)}`:'Sin tope'}</p></div><button onClick={()=>loadMatches(d.id)} className="text-[10px] font-semibold text-indigo-600">Buscar match</button></div>):<EmptyState title="Sin demandas" />}</div></section>
          </div>
          {matches.length>0 && <section className="section-card"><div className="section-card__header"><div><h3 className="section-card__title">Matching sugerido</h3><p className="section-card__subtitle">Propiedades compatibles ordenadas por score</p></div></div><div className="section-card__body grid md:grid-cols-2 gap-3">{matches.map((m:any)=><div key={m.id} className="border border-slate-100 rounded-xl p-3"><div className="flex justify-between"><div><p className="font-semibold text-xs"><Building2 className="inline w-4 h-4 mr-1"/>{m.code}</p><p className="text-[10px] text-slate-500">{m.address}</p></div><span className="text-sm font-bold text-indigo-600">{m.score}%</span></div><p className="text-xs mt-2">{formatCurrency(m.price,m.currency)}</p><p className="text-[9px] text-slate-400 mt-1">{m.reasons.join(' · ')}</p><button onClick={()=>run(()=>recordPropertyInterestAction({leadId:selectedLead.id,propertyId:m.id,score:m.score,reasons:m.reasons,status:'SENT'}),()=>window.location.reload())} className="mt-3 text-[10px] font-semibold text-indigo-600 inline-flex items-center gap-1">Marcar enviada <ArrowRight className="w-3 h-3"/></button></div>)}</div></section>}
        </>}
      </div>}
    </Drawer>
  </div>;
}

function Field({name,label,type='text',required,placeholder,defaultValue}:{name:string;label:string;type?:string;required?:boolean;placeholder?:string;defaultValue?:string}){return <label><span className="form-label">{label}</span><input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} className="form-input"/></label>}
function Select({name,label,options,required}:{name:string;label:string;options:any[];required?:boolean}){return <label><span className="form-label">{label}</span><select name={name} required={required} className="form-input">{options.map((o:any)=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>}
