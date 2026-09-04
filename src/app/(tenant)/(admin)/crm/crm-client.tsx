'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus, Search, MessageSquarePlus, Target, ArrowRight, Building2 } from 'lucide-react';
import { addLeadInteractionAction, getDemandMatchesAction, moveLeadAction, recordPropertyInterestAction, saveDemandAction, saveLeadAction } from '@/actions/crm';
import { formatCurrency } from '@/lib/utils';

const PIPELINE = [
  ['NEW','Nuevo'],['CONTACTED','Contactado'],['QUALIFIED','Calificado'],['PROPERTIES_SENT','Propiedades enviadas'],['VISIT_SCHEDULED','Visita agendada'],['VISITED','Visitó'],['NEGOTIATION','Negociación'],['RESERVATION','Reserva'],['WON','Ganado'],['LOST','Perdido'],
] as const;
const PRIORITIES = [['LOW','Baja'],['NORMAL','Normal'],['HIGH','Alta'],['URGENT','Urgente']] as const;

export function CrmClient({ data }: { data: any }) {
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [showDemand, setShowDemand] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.leads;
    return data.leads.filter((lead: any) => [lead.title, lead.contact?.firstName, lead.contact?.lastName, lead.contact?.phone, lead.contact?.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [data.leads, search]);

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

  function loadMatches(demandId: string) {
    run(() => getDemandMatchesAction(demandId), (rows) => setMatches(rows));
  }

  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="relative max-w-md w-full"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar lead, persona, teléfono..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"/></div>
      <button onClick={()=>setShowLeadForm(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"><Plus className="w-4 h-4"/>Nuevo lead</button>
    </div>
    {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">{error}</div>}

    {showLeadForm && <form onSubmit={submitLead} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-4 flex justify-between"><div><h2 className="font-bold">Nuevo lead</h2><p className="text-xs text-slate-500">Creá el contacto primero si todavía no existe.</p></div><button type="button" onClick={()=>setShowLeadForm(false)} className="text-xs">Cancelar</button></div>
      <Select name="contactId" label="Contacto *" required options={data.contacts.map((c:any)=>[c.id, `${c.firstName} ${c.lastName}`])}/>
      <Select name="agentId" label="Agente" options={[['','Sin asignar'],...data.users.map((u:any)=>[u.id,u.name])]}/>
      <Field name="title" label="Título *" required placeholder="Ej. Busca depto 2 amb Palermo"/>
      <Select name="priority" label="Prioridad" options={PRIORITIES as any}/>
      <Field name="source" label="Origen" placeholder="Instagram, referido, web..."/><Field name="channel" label="Canal" placeholder="WhatsApp, teléfono..."/><Field name="score" label="Score" type="number"/><Field name="nextActionAt" label="Próxima acción" type="datetime-local"/>
      <Field name="nextStep" label="Próximo paso"/><Field name="notes" label="Notas" className="md:col-span-3"/>
      <div className="md:col-span-4 flex justify-end"><button disabled={isPending} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">Guardar lead</button></div>
    </form>}

    <div className="overflow-x-auto pb-3">
      <div className="grid grid-flow-col auto-cols-[290px] gap-3 min-w-max">
        {PIPELINE.map(([status,label]) => {
          const rows = leads.filter((lead:any)=>lead.status===status);
          return <section key={status} className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 min-h-[350px]">
            <div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">{label}</h3><span className="text-[11px] px-2 py-0.5 bg-white rounded-full border">{rows.length}</span></div>
            <div className="space-y-2">{rows.map((lead:any)=><button key={lead.id} onClick={()=>{setSelectedLead(lead);setMatches([])}} className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-300 shadow-xs">
              <div className="flex justify-between gap-2"><p className="font-semibold text-sm text-slate-900">{lead.title}</p><span className={`text-[10px] font-bold ${lead.priority==='URGENT'?'text-rose-600':lead.priority==='HIGH'?'text-amber-600':'text-slate-400'}`}>{lead.priority}</span></div>
              <p className="text-xs text-slate-500 mt-1">{lead.contact.firstName} {lead.contact.lastName}</p>
              <p className="text-[11px] text-slate-400 mt-1">{lead.agent?.name || 'Sin agente'} · {lead.source || 'Sin origen'}</p>
            </button>)}</div>
          </section>;
        })}
      </div>
    </div>

    {selectedLead && <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{selectedLead.title}</h2><p className="text-sm text-slate-500">{selectedLead.contact.firstName} {selectedLead.contact.lastName} · {selectedLead.contact.phone || selectedLead.contact.email || 'sin contacto'}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>setShowInteraction(v=>!v)} className="btn"><MessageSquarePlus className="w-4 h-4"/>Interacción</button><button onClick={()=>setShowDemand(v=>!v)} className="btn"><Target className="w-4 h-4"/>Demanda</button></div></div>
      <div className="flex flex-wrap gap-1.5">{PIPELINE.map(([s,l])=><button key={s} disabled={isPending||s===selectedLead.status} onClick={()=>run(()=>moveLeadAction(selectedLead.id,s as any),()=>window.location.reload())} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s===selectedLead.status?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-600 border-slate-200'}`}>{l}</button>)}</div>
      {showInteraction && <form onSubmit={submitInteraction} className="grid md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg"><Select name="type" label="Tipo" options={[['CALL','Llamada'],['WHATSAPP','WhatsApp'],['EMAIL','Email'],['MEETING','Reunión'],['NOTE','Nota'],['OTHER','Otro']]}/><Field name="summary" label="Resumen *" required className="md:col-span-2"/><Field name="nextStep" label="Próximo paso"/><div className="md:col-span-4 flex justify-end"><button className="primary">Registrar</button></div></form>}
      {showDemand && <form onSubmit={submitDemand} className="grid md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg"><Select name="operation" label="Operación" options={[['RENT','Alquiler'],['SALE','Venta'],['TEMPORARY_RENT','Temporal'],['MANAGEMENT','Administración']]}/><Select name="propertyType" label="Tipo" options={[['','Todos'],['DEPARTAMENTO','Departamento'],['CASA','Casa'],['LOCAL','Local'],['TERRENO','Terreno'],['OFICINA','Oficina'],['COCHERA','Cochera'],['OTRO','Otro']]}/><Field name="zones" label="Zonas" placeholder="Palermo, Belgrano"/><Field name="currency" label="Moneda" defaultValue="ARS"/><Field name="budgetMin" label="Presupuesto mín." type="number"/><Field name="budgetMax" label="Presupuesto máx." type="number"/><Field name="roomsMin" label="Ambientes mín." type="number"/><Field name="bedroomsMin" label="Dormitorios mín." type="number"/><Field name="sqmMin" label="m² mín." type="number"/><Field name="notes" label="Notas" className="md:col-span-3"/><div className="md:col-span-4 flex justify-end"><button className="primary">Guardar demanda</button></div></form>}

      <div className="grid lg:grid-cols-2 gap-5">
        <div><h3 className="text-sm font-bold mb-2">Últimas interacciones</h3><div className="space-y-2">{selectedLead.interactions.length?selectedLead.interactions.map((i:any)=><div key={i.id} className="p-3 border rounded-lg"><div className="text-[10px] font-bold text-indigo-600">{i.type}</div><p className="text-sm mt-1">{i.summary}</p></div>):<p className="text-xs text-slate-400">Sin interacciones.</p>}</div></div>
        <div><h3 className="text-sm font-bold mb-2">Demandas activas</h3><div className="space-y-2">{selectedLead.demands.length?selectedLead.demands.map((d:any)=><div key={d.id} className="p-3 border rounded-lg flex justify-between gap-3"><div><p className="text-sm font-semibold">{d.operation} · {d.propertyType || 'Cualquier tipo'}</p><p className="text-xs text-slate-500">{d.budgetMax?`Hasta ${formatCurrency(d.budgetMax,d.currency)}`:'Sin tope'} </p></div><button onClick={()=>loadMatches(d.id)} className="text-xs font-semibold text-indigo-600">Buscar match</button></div>):<p className="text-xs text-slate-400">Sin demandas.</p>}</div></div>
      </div>

      {matches.length>0 && <div><h3 className="text-sm font-bold mb-2">Matching sugerido</h3><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{matches.map((m:any)=><div key={m.id} className="border rounded-lg p-3"><div className="flex justify-between"><div><p className="font-semibold text-sm"><Building2 className="inline w-4 h-4 mr-1"/>{m.code}</p><p className="text-xs text-slate-500">{m.address}</p></div><span className="text-sm font-bold text-indigo-600">{m.score}%</span></div><p className="text-xs mt-2">{formatCurrency(m.price,m.currency)}</p><p className="text-[10px] text-slate-400 mt-1">{m.reasons.join(' · ')}</p><button onClick={()=>run(()=>recordPropertyInterestAction({leadId:selectedLead.id,propertyId:m.id,score:m.score,reasons:m.reasons,status:'SENT'}),()=>window.location.reload())} className="mt-3 text-xs font-semibold text-indigo-600 inline-flex items-center gap-1">Marcar enviada <ArrowRight className="w-3 h-3"/></button></div>)}</div></div>}
    </div>}
    <style jsx>{`.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .75rem;border:1px solid #e2e8f0;border-radius:.5rem;font-size:.75rem;font-weight:600}.primary{padding:.5rem 1rem;background:#4f46e5;color:white;border-radius:.5rem;font-size:.75rem;font-weight:600}`}</style>
  </div>;
}

function Field({name,label,type='text',required,placeholder,defaultValue,className=''}:{name:string;label:string;type?:string;required?:boolean;placeholder?:string;defaultValue?:string;className?:string}){return <label className={className}><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"/></label>}
function Select({name,label,options,required}:{name:string;label:string;options:any[];required?:boolean}){return <label><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><select name={name} required={required} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">{options.map((o:any)=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>}
