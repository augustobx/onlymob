'use client';

import { useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2,ContactRound,Search,UserRound,KanbanSquare } from 'lucide-react';

type Result={id:string;type:string;title:string;subtitle:string;href:string};
export function GlobalSearch(){
 const router=useRouter();const[query,setQuery]=useState(''),[results,setResults]=useState<Result[]>([]),[open,setOpen]=useState(false),[loading,setLoading]=useState(false);const abort=useRef<AbortController|null>(null);
 useEffect(()=>{const q=query.trim();if(q.length<2){setResults([]);setOpen(false);return}const timer=setTimeout(async()=>{abort.current?.abort();const controller=new AbortController();abort.current=controller;setLoading(true);try{const response=await fetch(`/api/search/global?q=${encodeURIComponent(q)}`,{signal:controller.signal,cache:'no-store'});const data=await response.json();setResults(data.results||[]);setOpen(true)}catch(error){if((error as any)?.name!=='AbortError')setResults([])}finally{setLoading(false)}},220);return()=>clearTimeout(timer)},[query]);
 function go(result:Result){setOpen(false);setQuery('');router.push(result.href)}
 return <div className="global-search"><Search className="global-search__icon"/><input value={query} onFocus={()=>results.length&&setOpen(true)} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&results[0])go(results[0]);if(e.key==='Escape')setOpen(false)}} placeholder="Buscar propiedad, apellido, DNI, CUIT..." aria-label="Búsqueda global" className="global-search__input"/><span className="global-search__hint">⌘ K</span>{open&&<div className="global-search__panel"><div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{loading?'Buscando...':`${results.length} resultados`}</div>{results.length?results.map(result=><button key={`${result.type}-${result.id}`} onMouseDown={e=>e.preventDefault()} onClick={()=>go(result)} className="global-search__result"><div className="global-search__result-icon"><ResultIcon type={result.type}/></div><div className="min-w-0"><p className="font-semibold text-sm text-slate-900 truncate">{result.title}</p><p className="text-xs text-slate-500 truncate">{result.subtitle}</p></div><span className="ml-auto text-[10px] font-bold text-slate-400">{result.type}</span></button>):<div className="empty-state py-6">Sin resultados.</div>}</div>}</div>
}
function ResultIcon({type}:{type:string}){if(type==='PROPERTY')return <Building2 className="w-4 h-4"/>;if(type==='CONTACT')return <ContactRound className="w-4 h-4"/>;if(type==='RENTER')return <UserRound className="w-4 h-4"/>;return <KanbanSquare className="w-4 h-4"/>}
