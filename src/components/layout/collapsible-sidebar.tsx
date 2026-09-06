'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,LayoutDashboard,Home,Warehouse,FileText,CreditCard,Users,ContactRound,Settings,LogOut,
  KanbanSquare,CalendarDays,Handshake,Landmark,Wrench,Bell,FolderOpen,ChartNoAxesCombined,Plug,MessageSquare,WalletCards,CalendarClock,ChevronDown,
  Printer,TrendingUp,
} from 'lucide-react';
import { logoutAdminAction } from '@/actions/auth-actions';

interface SidebarProps { tenantName:string; userName:string; }
type NavItem={name:string;href:string;icon:any;quick?:boolean};
type NavGroup = { label:string; items:NavItem[] };
const itemRoute=(item:NavItem)=>item.href.split('#')[0];
const matches=(pathname:string,item:NavItem)=>pathname===itemRoute(item)||pathname.startsWith(`${itemRoute(item)}/`);

const groups:NavGroup[]=[
 {label:'General',items:[{name:'Dashboard',href:'/dashboard',icon:LayoutDashboard},{name:'Analytics',href:'/analytics',icon:ChartNoAxesCombined}]},
 {label:'Rápidos',items:[{name:'Aumentos',href:'/aumentos',icon:TrendingUp,quick:true},{name:'Impresión',href:'/impresion/recibos',icon:Printer,quick:true},{name:'Alquileres',href:'/rapidos/alquileres',icon:Home,quick:true}]},
 {label:'Comercial',items:[{name:'CRM',href:'/crm',icon:KanbanSquare},{name:'Agenda',href:'/agenda',icon:CalendarDays},{name:'Propiedades',href:'/propiedades',icon:Home},{name:'Operaciones',href:'/operaciones',icon:Handshake},{name:'Contactos',href:'/contactos',icon:ContactRound}]},
 {label:'Administración',items:[{name:'Inquilinos',href:'/inquilinos',icon:Users},{name:'Contratos',href:'/contratos',icon:FileText},{name:'Aumentos',href:'/aumentos',icon:CalendarClock},{name:'Cobranzas',href:'/cobranzas',icon:CreditCard},{name:'Finanzas',href:'/finanzas',icon:WalletCards},{name:'Liquidaciones',href:'/administracion',icon:Landmark},{name:'Cocheras',href:'/cocheras',icon:Warehouse}]},
 {label:'Operación',items:[{name:'Mantenimiento',href:'/mantenimiento',icon:Wrench},{name:'Documentos',href:'/documentos',icon:FolderOpen},{name:'Comunicaciones',href:'/comunicaciones',icon:MessageSquare},{name:'Notificaciones',href:'/notificaciones',icon:Bell}]},
 {label:'Sistema',items:[{name:'Integraciones',href:'/integraciones',icon:Plug},{name:'Configuración',href:'/ajustes',icon:Settings}]},
];

export function CollapsibleSidebar({tenantName,userName}:SidebarProps){
 const pathname=usePathname();
 const activeGroup=useMemo(()=>groups.find(group=>group.label!=='Rápidos'&&group.items.some(item=>matches(pathname,item)))?.label||'General',[pathname]);
 const [openGroups,setOpenGroups]=useState<Record<string,boolean>>(()=>Object.fromEntries(groups.map(group=>[group.label,group.label==='General'||group.label==='Rápidos'||group.label===activeGroup])));
 const toggle=(label:string)=>setOpenGroups(current=>({...current,[label]:!current[label]}));
 return <aside className="app-sidebar">
  <div className="app-sidebar__brand"><div className="app-sidebar__logo"><Building2 className="w-5 h-5"/></div><div className="min-w-0"><h1>{tenantName}</h1><p>OnlyMob · Real Estate OS</p></div></div>
  <nav className="app-sidebar__nav">{groups.map(group=>{const open=openGroups[group.label]||group.label===activeGroup;return <div key={group.label} className="app-sidebar__group">
    <button type="button" className="app-sidebar__group-toggle" onClick={()=>toggle(group.label)} aria-expanded={open}><span>{group.label}</span><ChevronDown className={`w-3 h-3 transition-transform ${open?'rotate-180':''}`}/></button>
    {open&&<div className="space-y-1">{group.items.map(item=>{const active=!item.quick&&matches(pathname,item);const Icon=item.icon;return <Link key={`${group.label}-${item.href}`} href={item.href} className={`app-sidebar__link ${active?'is-active':''}`}><Icon className="w-[17px] h-[17px]"/><span>{item.name}</span></Link>})}</div>}
  </div>})}</nav>
  <div className="app-sidebar__footer"><div className="app-sidebar__avatar">{userName.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-sm text-slate-100">{userName}</p><p className="text-[11px] text-slate-500">Equipo inmobiliario</p></div><form action={logoutAdminAction}><button type="submit" className="app-sidebar__logout" aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut className="w-4 h-4"/></button></form></div>
 </aside>
}
