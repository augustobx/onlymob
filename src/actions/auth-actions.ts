'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { platformPrisma } from '@/lib/prisma-core';
import {
  verifyPassword,
  createAdminSession,
  clearAdminSession,
  createRenterSession,
  clearRenterSession,
  createSuperAdminSession,
  clearSuperAdminSession,
} from '@/lib/auth';
import { resolveTenantContext } from '@/lib/tenant-context';

export type AuthActionResult = {
  success: boolean;
  error?: string;
};

// ==========================================
// ADMIN / STAFF LOGIN
// ==========================================
export async function loginAdminAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Completá todos los campos requeridos.' };
  }

  try {
    const tenant = await resolveTenantContext();

    const user = await platformPrisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (!user || !user.isActive) {
      return { success: false, error: 'Credenciales inválidas o usuario inactivo.' };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Credenciales inválidas o usuario inactivo.' };
    }

    // Actualizar último login
    await platformPrisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createAdminSession({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error durante la autenticación.' };
  }
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect('/login');
}

// ==========================================
// INQUILINO / RENTER PORTAL LOGIN
// ==========================================
export async function loginRenterAction(formData: FormData): Promise<AuthActionResult> {
  const identifier = (formData.get('identifier') as string)?.trim();
  const password = formData.get('password') as string;

  if (!identifier || !password) {
    return { success: false, error: 'Ingresá tu DNI/Correo y contraseña.' };
  }

  try {
    const tenant = await resolveTenantContext();

    // Buscar por DNI o por Email dentro del Tenant
    const renter = await platformPrisma.propertyRenter.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { dni: identifier },
          { email: identifier.toLowerCase() },
        ],
      },
    });

    if (!renter || renter.status !== 'ACTIVE' || !renter.portalPasswordHash) {
      return {
        success: false,
        error: 'Inquilino no habilitado para acceso al portal. Contactá a la inmobiliaria.',
      };
    }

    const isValid = await verifyPassword(password, renter.portalPasswordHash);
    if (!isValid) {
      return { success: false, error: 'Credenciales incorrectas.' };
    }

    await createRenterSession({
      id: renter.id,
      tenantId: renter.tenantId,
      dni: renter.dni,
      firstName: renter.firstName,
      lastName: renter.lastName,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al ingresar al portal.' };
  }
}

export async function logoutRenterAction() {
  await clearRenterSession();
  redirect('/portal/login');
}

// ==========================================
// SUPERADMIN (PLATFORM) LOGIN
// ==========================================
export async function loginSuperAdminAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Completá todos los campos.' };
  }

  try {
    const superadmin = await platformPrisma.superAdminUser.findUnique({
      where: { email },
    });

    if (!superadmin) {
      return { success: false, error: 'Credenciales inválidas de plataforma.' };
    }

    const isValid = await verifyPassword(password, superadmin.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Credenciales inválidas de plataforma.' };
    }

    await createSuperAdminSession({
      id: superadmin.id,
      email: superadmin.email,
      name: superadmin.name,
      role: superadmin.role,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de autenticación SuperAdmin.' };
  }
}

export async function logoutSuperAdminAction() {
  await clearSuperAdminSession();
  redirect('/superadmin/login');
}
