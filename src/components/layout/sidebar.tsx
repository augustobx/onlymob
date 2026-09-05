'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  Home,
  Warehouse,
  FileText,
  CreditCard,
  Users,
  ContactRound,
  Settings,
  LogOut,
  KanbanSquare,
  CalendarDays,
  Handshake,
  Landmark,
  Wrench,
  Bell,
  FolderOpen,
} from 'lucide-react';
import { logoutAdminAction } from '@/actions/auth-actions';

interface SidebarProps {
  tenantName: string;
  userName: string;
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'CRM', href: '/crm', icon: KanbanSquare },
  { name: 'Agenda', href: '/agenda', icon: CalendarDays },
  { name: 'Propiedades', href: '/propiedades', icon: Home },
  { name: 'Operaciones', href: '/operaciones', icon: Handshake },
  { name: 'Contactos', href: '/contactos', icon: ContactRound },
  { name: 'Inquilinos', href: '/inquilinos', icon: Users },
  { name: 'Cocheras', href: '/cocheras', icon: Warehouse },
  { name: 'Contratos', href: '/contratos', icon: FileText },
  { name: 'Mantenimiento', href: '/mantenimiento', icon: Wrench },
  { name: 'Cobranzas & Pagos', href: '/cobranzas', icon: CreditCard },
  { name: 'Administración', href: '/administracion', icon: Landmark },
  { name: 'Documentos', href: '/documentos', icon: FolderOpen },
  { name: 'Notificaciones', href: '/notificaciones', icon: Bell },
  { name: 'Configuraciones', href: '/ajustes', icon: Settings },
];

export function Sidebar({ tenantName, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 min-h-screen">
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-white text-base truncate leading-tight tracking-tight">{tenantName}</h1>
          <p className="text-xs text-indigo-400 font-medium">OnlyMob Inmobiliaria</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[11px] text-slate-500">Usuario de inmobiliaria</p>
          </div>
          <form action={logoutAdminAction}>
            <button type="submit" title="Cerrar Sesión" className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
