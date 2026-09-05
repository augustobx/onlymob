import { Header } from '@/components/layout/header';
import { getContactsAction } from '@/actions/contacts';
import { getPropertiesAction } from '@/actions/properties';
import { ContactsClient } from './contacts-client';
import { OwnershipManager } from './ownership-manager';
import { OwnerPortalAccessManager } from './owner-portal-access-manager';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const [contacts, properties] = await Promise.all([
    getContactsAction(),
    getPropertiesAction(),
  ]);

  const serializedContacts = contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    companyName: contact.companyName,
    documentType: contact.documentType,
    documentNumber: contact.documentNumber,
    cuit: contact.cuit,
    email: contact.email,
    phone: contact.phone,
    alternatePhone: contact.alternatePhone,
    address: contact.address,
    city: contact.city,
    province: contact.province,
    postalCode: contact.postalCode,
    bankAlias: contact.bankAlias,
    bankCbu: contact.bankCbu,
    notes: contact.notes,
    ownerPortalEnabled: contact.ownerPortalEnabled,
    hasOwnerPortalPassword: !!contact.ownerPortalPasswordHash,
    roles: contact.roles.map((role) => role.role),
    ownedProperties: contact.ownedProperties.map((owner) => ({
      id: owner.id,
      propertyId: owner.propertyId,
      propertyCode: owner.property.code,
      propertyAddress: owner.property.address,
      percentage: Number(owner.ownershipPercentage),
      isPrimary: owner.isPrimary,
    })),
  }));

  const propertyOptions = properties.map((property) => ({
    id: property.id,
    code: property.code,
    address: property.address,
    owners: property.owners || [],
  }));

  return (
    <div>
      <Header
        title="Contactos & Propietarios"
        subtitle="Base unificada de propietarios, prospectos, garantes y proveedores"
      />
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <OwnerPortalAccessManager contacts={serializedContacts} />
        <OwnershipManager contacts={serializedContacts} properties={propertyOptions} />
        <ContactsClient initialContacts={serializedContacts} />
      </div>
    </div>
  );
}
