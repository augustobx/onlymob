'use client';

import { useState, useTransition } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Plus, ListTodo } from 'lucide-react';
import { saveCalendarEventAction, saveTaskAction, setCalendarEventStatusAction, setTaskStatusAction } from '@/actions/crm';

export function AgendaClient({ data }: { data: any }) {
  const [showTask, setShowTask] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const run = (task: () => Promise<any>) => {
    setError('');
    startTransition(async () => {
      try { await task(); window.location.reload(); }
      catch (err: any) { setError(err?.message || 'No se pudo completar la operación.'); }
    });
  };

  function submitTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    run(() => saveTaskAction({
      title: String(f.get('title') || ''), description: String(f.get('description') || ''), dueAt: String(f.get('dueAt') || '') || undefined,
      priority: String(f.get('priority') || 'NORMAL') as any, assignedUserId: String(f.get('assignedUserId') || '') || undefined,
      leadId: String(f.get('leadId') || '') || undefined, contactId: String(f.get('contactId') || '') || undefined, propertyId: String(f.get('propertyId') || '') || undefined,
    }));
  }

  function submitEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    run(() => saveCalendarEventAction({
      title: String(f.get('title') || ''), type: String(f.get('type') || 'VISIT') as any, startsAt: String(f.get('startsAt') || ''), endsAt: String(f.get('endsAt') || '') || undefined,
      location: String(f.get('location') || ''), notes: String(f.get('notes') || ''), agentId: String(f.get('agentId') || '') || undefined,
      leadId: String(f.get('leadId') || '') || undefined, contactId: String(f.get('contactId') || '') || undefined, propertyId: String(f.get('propertyId') || '') || undefined,
    }));
  }

  const now = Date.now();
  const openTasks = data.tasks.filter((t:any)=>!['DONE','CANCELED'].includes(t.status));
  const overdue = openTasks.filter((t:any)=>t.dueAt && new Date(t.dueAt).getTime() < now);
  const upcomingEvents = data.events.filter((e:any)=>e.status==='SCHEDULED');

  return <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Metric icon={<ListTodo className="w-5 h-5"/>} label="Tareas abiertas" value={openTasks.length}/>
      <Metric icon={<Clock3 className="w-5 h-5"/>} label="Vencidas" value={overdue.length} danger={overdue.length>0}/>
      <Metric icon={<CalendarDays className="w-5 h-5"/>} label="Eventos agendados" value={upcomingEvents.length}/>
    </div>
    <div className="flex flex-wrap justify-end gap-2"><button onClick={()=>setShowTask(v=>!v)} className="action"><Plus className="w-4 h-4"/>Nueva tarea</button><button onClick={()=>setShowEvent(v=>!v)} className="action primary"><Plus className="w-4 h-4"/>Nueva visita/evento</button></div>
    {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-sm text-rose-700">{error}</div>}

    {showTask && <form onSubmit={submitTask} className="card grid md:grid-cols-4 gap-3"><h2 className="md:col-span-4 font-bold">Nueva tarea</h2><Field name="title" label="Título *" required/><Field name="dueAt" label="Vence" type="datetime-local"/><Select name="priority" label="Prioridad" options={[['LOW','Baja'],['NORMAL','Normal'],['HIGH','Alta'],['URGENT','Urgente']]}/><Select name="assignedUserId" label="Responsable" options={[['','Sin asignar'],...data.users.map((u:any)=>[u.id,u.name])]}/><Select name="leadId" label="Lead" options={[['','Sin lead'],...data.leads.map((l:any)=>[l.id,l.title])]}/><Select name="contactId" label="Contacto" options={[['','Sin contacto'],...data.contacts.map((c:any)=>[c.id,`${c.firstName} ${c.lastName}`])]}/><Select name="propertyId" label="Propiedad" options={[['','Sin propiedad'],...data.properties.map((p:any)=>[p.id,`${p.code} · ${p.address}`])]}/><Field name="description" label="Descripción"/><div className="md:col-span-4 flex justify-end"><button disabled={isPending} className="submit">Guardar tarea</button></div></form>}

    {showEvent && <form onSubmit={submitEvent} className="card grid md:grid-cols-4 gap-3"><h2 className="md:col-span-4 font-bold">Nueva visita / evento</h2><Field name="title" label="Título *" required/><Select name="type" label="Tipo" options={[['VISIT','Visita'],['MEETING','Reunión'],['CALL','Llamada'],['OTHER','Otro']]}/><Field name="startsAt" label="Inicio *" type="datetime-local" required/><Field name="endsAt" label="Fin" type="datetime-local"/><Select name="agentId" label="Agente" options={[['','Sin asignar'],...data.users.map((u:any)=>[u.id,u.name])]}/><Select name="leadId" label="Lead" options={[['','Sin lead'],...data.leads.map((l:any)=>[l.id,l.title])]}/><Select name="contactId" label="Contacto" options={[['','Sin contacto'],...data.contacts.map((c:any)=>[c.id,`${c.firstName} ${c.lastName}`])]}/><Select name="propertyId" label="Propiedad" options={[['','Sin propiedad'],...data.properties.map((p:any)=>[p.id,`${p.code} · ${p.address}`])]}/><Field name="location" label="Ubicación"/><Field name="notes" label="Notas" className="md:col-span-3"/><div className="md:col-span-4 flex justify-end"><button disabled={isPending} className="submit">Agendar</button></div></form>}

    <div className="grid xl:grid-cols-2 gap-6">
      <section className="card"><h2 className="font-bold text-slate-900 mb-4">Tareas</h2><div className="space-y-2">{data.tasks.length===0?<Empty text="No hay tareas."/>:data.tasks.map((t:any)=>{const late=t.dueAt&&!['DONE','CANCELED'].includes(t.status)&&new Date(t.dueAt).getTime()<now;return <div key={t.id} className={`p-3 rounded-lg border ${late?'border-rose-200 bg-rose-50/50':'border-slate-200'}`}><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{t.title}</p><p className="text-xs text-slate-500 mt-1">{t.assignee?.name||'Sin responsable'}{t.lead?` · ${t.lead.title}`:''}</p><p className={`text-[11px] mt-1 ${late?'text-rose-600 font-semibold':'text-slate-400'}`}>{t.dueAt?new Date(t.dueAt).toLocaleString('es-AR'):'Sin vencimiento'} · {t.priority}</p></div>{!['DONE','CANCELED'].includes(t.status)&&<button onClick={()=>run(()=>setTaskStatusAction(t.id,'DONE'))} title="Completar" className="p-2 text-emerald-600"><CheckCircle2 className="w-5 h-5"/></button>}</div></div>})}</div></section>
      <section className="card"><h2 className="font-bold text-slate-900 mb-4">Agenda</h2><div className="space-y-2">{data.events.length===0?<Empty text="No hay eventos."/>:data.events.map((e:any)=><div key={e.id} className="p-3 rounded-lg border border-slate-200"><div className="flex justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-indigo-600">{e.type}</span><p className="text-sm font-semibold">{e.title}</p></div><p className="text-xs text-slate-500 mt-1">{new Date(e.startsAt).toLocaleString('es-AR')} · {e.agent?.name||'Sin agente'}</p><p className="text-[11px] text-slate-400 mt-1">{[e.property&&`${e.property.code} ${e.property.address}`,e.lead?.title,e.location].filter(Boolean).join(' · ')}</p></div>{e.status==='SCHEDULED'&&<div className="flex gap-1"><button onClick={()=>run(()=>setCalendarEventStatusAction(e.id,'COMPLETED'))} className="text-xs text-emerald-600 font-semibold">Completar</button><button onClick={()=>run(()=>setCalendarEventStatusAction(e.id,'CANCELED'))} className="text-xs text-rose-600 font-semibold">Cancelar</button></div>}</div></div>)}</div></section>
    </div>
    <style jsx>{`.card{background:white;border:1px solid #e2e8f0;border-radius:.75rem;padding:1.25rem}.action{display:inline-flex;align-items:center;gap:.4rem;padding:.55rem .85rem;border:1px solid #e2e8f0;border-radius:.5rem;font-size:.8rem;font-weight:600;background:white}.primary,.submit{background:#4f46e5;color:white;border-color:#4f46e5}.submit{padding:.55rem 1rem;border-radius:.5rem;font-size:.8rem;font-weight:600}`}</style>
  </div>;
}

function Metric({icon,label,value,danger}:{icon:React.ReactNode;label:string;value:number;danger?:boolean}){return <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${danger?'bg-rose-50 text-rose-600':'bg-indigo-50 text-indigo-600'}`}>{icon}</div><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>}
function Field({name,label,type='text',required,className=''}:{name:string;label:string;type?:string;required?:boolean;className?:string}){return <label className={className}><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><input name={name} type={type} required={required} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"/></label>}
function Select({name,label,options}:{name:string;label:string;options:any[]}){return <label><span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span><select name={name} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">{options.map((o:any)=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>}
function Empty({text}:{text:string}){return <div className="py-10 text-center text-xs text-slate-400">{text}</div>}
