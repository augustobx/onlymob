'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,LayoutDashboard,Home,Warehouse,FileText,CreditCard,Users,ContactRound,Settings,LogOut,
  KanbanSquare,CalendarDays,Handshake,Landmark,Wrench,Bell,FolderOpen,ChartNoAxesCombined,Plug,MessageSquare,WalletCards,
} from 'lucide-react';
import { logoutAdminAction } from '@/actions/auth-actions';

interface SidebarProps { tenantName:string; userName:string; }
const groups=[
 {label:'General',items:[{name:'Dashboard',href:'/dashboard',icon:LayoutDashboard},{name:'Analytics',href:'/analytics',icon:ChartNoAxesCombined}]},
 {label:'Comercial',items:[{name:'CRM',href:'/crm',icon:KanbanSquare},{name:'Agenda',href:'/agenda',icon:CalendarDays},{name:'Propiedades',href:'/propiedades',icon:Home},{name:'Operaciones',href:'/operaciones',icon:Handshake},{name:'Contactos',href:'/contactos',icon:ContactRound}]},
 {label:'Administración',items:[{name:'Inquilinos',href:'/inquilinos',icon:Users},{name:'Contratos',href:'/contratos',icon:FileText},{name:'Cobranzas',href:'/cobranzas',icon:CreditCard},{name:'Finanzas',href:'/finanzas',icon:WalletCards},{name:'Liquidaciones',href:'/administracion',icon:Landmark},{name:'Cocheras',href:'/cocheras',icon:Warehouse}]},
 {label:'Operación',items:[{name:'Mantenimiento',href:'/mantenimiento',icon:Wrench},{name:'Documentos',href:'/documentos',icon:FolderOpen},{name:'Comunicaciones',href:'/comunicaciones',icon:MessageSquare},{name:'Notificaciones',href:'/notificaciones',icon:Bell}]},
 {label:'Sistema',items:[{name:'Integraciones',href:'/integraciones',icon:Plug},{name:'Configuración',href:'/ajustes',icon:Settings}]},
];

export function Sidebar({tenantName,userName}:SidebarProps){
 const pathname=usePathname();
 return <aside className="app-sidebar">
  <div className="app-sidebar__brand"><div className="app-sidebar__logo"><Building2 className="w-5 h-5"/></div><div className="min-w-0"><h1>{tenantName}</h1><p>OnlyMob · Real Estate OS</p></div></div>
  <nav className="app-sidebar__nav">{groups.map(group=><div key={group.label} className="app-sidebar__group"><p className="app-sidebar__group-label">{group.label}</p><div className="space-y-1">{group.items.map(item=>{const active=pathname===item.href||pathname.startsWith(`${item.href}/`);const Icon=item.icon;return <Link key={item.href} href={item.href} className={`app-sidebar__link ${active?'is-active':''}`}><Icon className="w-[17px] h-[17px]"/><span>{item.name}</span></Link>})}</div></div>)}</nav>
  <div className="app-sidebar__footer"><div className="app-sidebar__avatar">{userName.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-sm text-slate-100">{userName}</p><p className="text-[11px] text-slate-500">Equipo inmobiliario</p></div><form action={logoutAdminAction}><button type="submit" className="app-sidebar__logout" aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut className="w-4 h-4"/></button></form></div>
 </aside>
}
