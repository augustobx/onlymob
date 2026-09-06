import type { Metadata } from 'next';
import './portal.css';
import { PwaRegister } from './pwa-register';

export const metadata: Metadata = {
  title: 'Mi alquiler | OnlyMob',
  description: 'Tu alquiler, pagos, documentos y mantenimiento en un solo lugar.',
  manifest: '/manifest.json',
  icons: {
    icon: '/onlymob-icon.svg',
    apple: '/onlymob-icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'OnlyMob',
    statusBarStyle: 'black-translucent',
  },
};

export default function RenterPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="renter-pwa">
      <PwaRegister />
      {children}
    </div>
  );
}
