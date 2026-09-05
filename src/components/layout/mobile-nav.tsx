'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesCombined,CreditCard,Home,LayoutDashboard,Menu,MessageSquare,Settings,Users,WalletCards,Wrench } from 'lucide-react';

const primary=[{label:'Inicio',href:'/dashboard',icon:LayoutDashboard},{label:'Propiedades',href:'/propiedades',icon:Home},{label:'Cobranzas',href:'/cobranzas',icon:CreditCard},{label:'Mensajes',href:'/comunicaciones',icon:MessageSquare}];
const more=[{label:'Analytics',href:'/analytics',icon:ChartNoAxesCombined},{label:'Contactos',href:'/contactos',icon:Users},{label:'Mantenimiento',href:'/mantenimiento',icon:Wrench},{label:'Finanzas',href:'/finanzas',icon:WalletCards},{label:'Ajustes',href:'/ajustes',icon:Settings}];
export function MobileNav(){const path=usePathname();return <nav className="mobile-nav lg:hidden">{primary.map(item=>{const active=path.startsWith(item.href);const Icon=item.icon;return <Link key={item.href} href={item.href} className={`mobile-nav__item ${active?'is-active':''}`}><Icon className="w-5 h-5"/><span>{item.label}</span></Link>})}<details className="mobile-nav__more"><summary className="mobile-nav__item"><Menu className="w-5 h-5"/><span>Más</span></summary><div className="mobile-nav__sheet">{more.map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="mobile-nav__sheet-link"><Icon className="w-4 h-4"/>{item.label}</Link>})}</div></details></nav>}
