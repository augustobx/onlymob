'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Mail, MessageCircle, MessageSquare, Plus, Send } from 'lucide-react';
import { createCommunicationThreadAction, getCommunicationThreadAction, sendCommunicationMessageAction, setCommunicationThreadStatusAction } from '@/actions/communications';

const CHANNELS = [['INTERNAL','Portal'],['EMAIL','Email'],['WHATSAPP','WhatsApp']] as const;
const AUDIENCES = [['OWNER','Propietario'],['RENTER','Inquilino'],['CONTACT','Contacto']] as const;

export function CommunicationsClient({ data }: { data: any }) {
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [messages,setMessages]=useState<any[]>([]);
  const [showNew,setShowNew]=useState(false);
  const [error,setError]=useState('');
  const [isPending,startTransition]=useTransition();
  const selected=useMemo(()=>data.threads.find((t:any)=>t.id===selectedId),[data.threads,selectedId]);

  function openThread(id:string){
    setSelectedId(id);
    setError('');
    startTransition(async()=>{
      try{setMessages(await getCommunicationThreadAction(id) as any[])}
      catch(e:any){setError(e?.message||'No se pudo abrir la conversación.')}
    });
  }

  useEffect(()=>{
    const requestedId = new URLSearchParams(window.location.search).get('thread');
    const initialId = requestedId && data.threads.some((thread:any)=>thread.id===requestedId)
      ? requestedId
      : data.threads[0]?.id;
    if(initialId) openThread(initialId);
    // Carga inicial solamente al montar la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function submitNew(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);startTransition(async()=>{try{const result=await createCommunicationThreadAction({subject:String(f.get('subject')||''),propertyId:String(f.get('propertyId')||'')||null,contactId:String(f.get('contactId')||'')||null,renterId:String(f.get('renterId')||'')||null,audienceType:String(f.get('audienceType')||'OWNER') as any,channel:String(f.get('channel')||'INTERNAL') as any,body:String(f.get('body')||'')});setShowNew(false);window.location.href=`/comunicaciones?thread=${result.threadId}`;}catch(e:any){setError(e?.message||'No se pudo crear la conversación.');}})}
  function send(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!selectedId)return;const f=new FormData(event.currentTarget);startTransition(async()=>{try{await sendCommunicationMessageAction({threadId:selectedId,channel:String(f.get('channel')||'INTERNAL') as any,audienceType:String(f.get('audienceType')||'OWNER') as any,body:String(f.get('body')||'')});setMessages(await getCommunicationThreadAction(selectedId) as any[]);(event.target as HTMLFormElement).reset();}catch(e:any){setError(e?.message||'No se pudo enviar el mensaje.');}})}
  function toggleThread(){if(!selected)return;startTransition(async()=>{try{await setCommunicationThreadStatusAction(selected.id,selected.status==='OPEN'?'CLOSED':'OPEN');window.location.reload();}catch(e:any){setError(e?.message||'No se pudo actualizar la conversación.');}})}

  return <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Inbox</h2><p className="text-sm text-slate-500">Conversaciones vinculadas a propiedades, propietarios e inquilinos.</p></div><button onClick={()=>setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4"/> Nueva conversación</button></div>
    {error&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    {showNew&&<form onSubmit={submitNew} className="section-card p-5 grid md:grid-cols-2 gap-4"><Field label="Asunto" name="subject" required/><Select label="Canal" name="channel" options={CHANNELS as any}/><Select label="Audiencia" name="audienceType" options={AUDIENCES as any}/><Select label="Propiedad" name="propertyId" optional options={data.properties.map((p:any)=>[p.id,`${p.code} · ${p.address}`])}/><Select label="Contacto / propietario" name="contactId" optional options={data.contacts.map((c:any)=>[c.id,c.companyName||`${c.firstName} ${c.lastName}`])}/><Select label="Inquilino" name="renterId" optional options={data.renters.map((r:any)=>[r.id,`${r.lastName}, ${r.firstName} · DNI ${r.dni}`])}/><div className="md:col-span-2"><label className="form-label">Mensaje</label><textarea name="body" required rows={5} className="form-input"/></div><div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={()=>setShowNew(false)} className="btn-secondary">Cancelar</button><button disabled={isPending} className="btn-primary"><Send className="w-4 h-4"/> Crear y enviar</button></div></form>}

    <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-5 min-h-[620px]">
      <aside className="section-card overflow-hidden"><div className="p-3 border-b border-slate-100"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Conversaciones</p></div><div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100">{data.threads.length?data.threads.map((t:any)=><button key={t.id} onClick={()=>openThread(t.id)} className={`w-full text-left p-4 transition-colors ${selectedId===t.id?'bg-indigo-50':'hover:bg-slate-50'}`}><div className="flex justify-between gap-3"><p className="font-semibold text-sm text-slate-900 truncate">{t.subject}</p><span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(t.lastMessageAt||t.updatedAt).toLocaleDateString('es-AR')}</span></div><p className="text-xs text-slate-500 mt-1 truncate">{t.propertyCode?`${t.propertyCode} · ${t.propertyAddress}`:(t.contactCompany||t.contactName||t.renterName||'Sin vínculo')}</p><div className="flex gap-2 mt-2"><span className="status-pill status-pill--neutral">{Number(t.messageCount||0)} mensajes</span>{Number(t.failedCount||0)>0&&<span className="status-pill status-pill--danger">{t.failedCount} fallidos</span>}</div></button>):<div className="empty-state">Todavía no hay conversaciones.</div>}</div></aside>
      <section className="section-card flex flex-col min-w-0">{selected?<><div className="section-card__header"><div><h3 className="section-card__title">{selected.subject}</h3><p className="section-card__subtitle">{selected.propertyCode?`${selected.propertyCode} · ${selected.propertyAddress}`:(selected.contactCompany||selected.contactName||selected.renterName||'Conversación general')}</p></div><button onClick={toggleThread} className="btn-secondary">{selected.status==='OPEN'?'Cerrar':'Reabrir'}</button></div><div className="flex-1 p-5 space-y-3 overflow-y-auto bg-slate-50/40">{isPending&&messages.length===0?<div className="empty-state">Cargando conversación...</div>:messages.length?messages.map((m:any)=><div key={m.id} className={`max-w-[82%] rounded-2xl p-3.5 border ${m.direction==='OUTBOUND'?'ml-auto bg-white border-indigo-100 shadow-xs':'bg-slate-100 border-slate-200'}`}><div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400"><ChannelIcon channel={m.channel}/><span>{m.channel}</span><span>·</span><span>{m.status}</span></div><p className="text-sm text-slate-700 whitespace-pre-wrap mt-2">{m.body}</p>{m.failureMessage&&<p className="text-xs text-rose-600 mt-2">{m.failureMessage}</p>}<p className="text-[10px] text-slate-400 mt-2">{new Date(m.createdAt).toLocaleString('es-AR')} {m.senderName?`· ${m.senderName}`:''}</p></div>):<div className="empty-state">Esta conversación todavía no tiene mensajes.</div>}</div><form onSubmit={send} className="p-4 border-t border-slate-100 grid sm:grid-cols-[130px_150px_1fr_auto] gap-2"><select name="channel" className="form-input text-sm">{CHANNELS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select name="audienceType" className="form-input text-sm">{AUDIENCES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input name="body" required placeholder="Escribí un mensaje..." className="form-input"/><button disabled={isPending||selected.status!=='OPEN'} className="btn-primary"><Send className="w-4 h-4"/></button></form></>:<div className="empty-state m-auto"><MessageSquare className="w-10 h-10 mx-auto mb-3"/>{data.threads.length?'Cargando conversación...':'Todavía no hay conversaciones.'}</div>}</section>
    </div>
  </div>;
}

function ChannelIcon({channel}:{channel:string}){return channel==='EMAIL'?<Mail className="w-3 h-3"/>:channel==='WHATSAPP'?<MessageCircle className="w-3 h-3"/>:<MessageSquare className="w-3 h-3"/>}
function Field({label,name,required}:{label:string;name:string;required?:boolean}){return <div><label className="form-label">{label}</label><input name={name} required={required} className="form-input"/></div>}
function Select({label,name,options,optional}:{label:string;name:string;options:Array<readonly [string,string]>;optional?:boolean}){return <div><label className="form-label">{label}</label><select name={name} className="form-input">{optional&&<option value="">Sin asignar</option>}{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>}
