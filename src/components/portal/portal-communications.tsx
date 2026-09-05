'use client';

import { useState, useTransition } from 'react';
import { CheckCheck, MailOpen, MessageSquare } from 'lucide-react';
import { markPortalCommunicationReadAction } from '@/actions/communications';

export function PortalCommunications({ messages, audience }: { messages: any[]; audience: 'RENTER'|'OWNER' }) {
  const [items,setItems]=useState(messages);
  const [pending,startTransition]=useTransition();
  const unread=items.filter((item)=>!item.readAt).length;

  function markRead(id:string){startTransition(async()=>{await markPortalCommunicationReadAction(id,audience);setItems((current)=>current.map((item)=>item.id===id?{...item,readAt:new Date().toISOString(),status:item.status==='SENT'?'READ':item.status}:item))})}

  return <section className="portal-panel mt-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div><div className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-600"/><h2 className="text-base font-bold text-slate-900">Comunicaciones</h2>{unread>0&&<span className="status-pill status-pill--info">{unread} nuevas</span>}</div><p className="text-xs text-slate-500 mt-1">Mensajes enviados por la inmobiliaria vinculados a tu cuenta.</p></div>
    </div>
    <div className="space-y-3">{items.length?items.map((message)=><article key={message.id} className={`rounded-2xl border p-4 ${message.readAt?'border-slate-200 bg-white':'border-indigo-200 bg-indigo-50/50'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-sm text-slate-900">{message.subject}</p>{message.propertyCode&&<p className="text-xs text-slate-500 mt-0.5">{message.propertyCode} · {message.propertyAddress}</p>}</div><time className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(message.createdAt).toLocaleDateString('es-AR')}</time></div><p className="text-sm text-slate-700 whitespace-pre-wrap mt-3">{message.body}</p>{!message.readAt&&<button disabled={pending} onClick={()=>markRead(message.id)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600"><CheckCheck className="w-3.5 h-3.5"/> Marcar como leído</button>}</article>):<div className="empty-state"><MailOpen className="w-8 h-8 mx-auto mb-2"/>No hay comunicaciones todavía.</div>}</div>
  </section>;
}
