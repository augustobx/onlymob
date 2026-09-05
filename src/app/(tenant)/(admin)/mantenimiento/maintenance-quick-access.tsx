'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';

export function MaintenanceQuickAccess({ requests }: { requests: Array<{ id:string; title:string; category:string; status:string; property:{ code:string; address:string }; renter?:{ firstName:string; lastName:string; dni:string }|null; provider?:{ firstName:string; lastName:string; companyName:string|null }|null }> }) {
  const [query,setQuery]=useState('');
  const normalized=query.trim().toLowerCase();
  const matches=useMemo(()=>{
    if(!normalized) return [];
    return requests.filter((request)=>[
      request.title,request.category,request.status,request.property.code,request.property.address,
      request.renter ? `${request.renter.firstName} ${request.renter.lastName} ${request.renter.dni}` : '',
      request.provider ? `${request.provider.companyName||''} ${request.provider.firstName} ${request.provider.lastName}` : '',
    ].some((value)=>String(value).toLowerCase().includes(normalized))).slice(0,12);
  },[normalized,requests]);

  return <div className="section-card p-4 mb-5">
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="sm:w-64"><p className="text-sm font-bold text-slate-900">Abrir Mantenimiento 360</p><p className="text-xs text-slate-500">Buscá por orden, propiedad, inquilino o proveedor.</p></div>
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Ej: pérdida cocina, TOM-004, Pérez..." className="form-input pl-9"/></div>
    </div>
    {normalized && <div className="mt-3 grid md:grid-cols-2 xl:grid-cols-3 gap-2">{matches.length ? matches.map((request)=><Link key={request.id} href={`/mantenimiento/${request.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-indigo-200 hover:bg-indigo-50/50"><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{request.title}</p><p className="text-xs text-slate-500 truncate">{request.property.code} · {request.property.address}</p></div><ExternalLink className="w-4 h-4 text-indigo-600 flex-shrink-0"/></Link>) : <p className="text-sm text-slate-400 py-2">No hay órdenes que coincidan.</p>}</div>}
  </div>;
}
