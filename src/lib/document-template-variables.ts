export const DOCUMENT_TEMPLATE_VARIABLES = [
  '{{today}}', '{{tenant.name}}', '{{tenant.cuit}}', '{{tenant.address}}', '{{tenant.phone}}',
  '{{property.code}}', '{{property.address}}', '{{property.type}}', '{{property.city}}', '{{property.province}}', '{{property.operation}}', '{{property.rentPrice}}', '{{property.salePrice}}',
  '{{contact.fullName}}', '{{contact.document}}', '{{contact.cuit}}', '{{contact.email}}', '{{contact.phone}}', '{{contact.address}}',
  '{{renter.fullName}}', '{{renter.dni}}', '{{renter.email}}', '{{renter.phone}}', '{{renter.address}}',
  '{{lease.startDate}}', '{{lease.endDate}}', '{{lease.currentRent}}', '{{lease.deposit}}', '{{lease.propertyCode}}', '{{lease.propertyAddress}}', '{{lease.renterName}}', '{{lease.renterDni}}', '{{lease.guarantorName}}', '{{lease.nextAdjustmentDate}}',
  '{{deal.operation}}', '{{deal.status}}', '{{deal.amount}}', '{{deal.propertyCode}}', '{{deal.propertyAddress}}', '{{deal.contactName}}', '{{deal.agentName}}',
  '{{payment.amount}}', '{{payment.date}}', '{{payment.method}}', '{{payment.reference}}', '{{payment.receiptNumber}}', '{{payment.renterName}}', '{{payment.renterDni}}', '{{payment.propertyAddress}}',
  '{{maintenance.title}}', '{{maintenance.category}}', '{{maintenance.status}}', '{{maintenance.priority}}', '{{maintenance.description}}', '{{maintenance.propertyCode}}', '{{maintenance.propertyAddress}}', '{{maintenance.renterName}}', '{{maintenance.providerName}}', '{{maintenance.actualCost}}',
  '{{settlement.ownerName}}', '{{settlement.periodStart}}', '{{settlement.periodEnd}}', '{{settlement.grossCollected}}', '{{settlement.expensesTotal}}', '{{settlement.commissionTotal}}', '{{settlement.taxesTotal}}', '{{settlement.netAmount}}',
  '{{inspection.type}}', '{{inspection.status}}', '{{inspection.scheduledAt}}', '{{inspection.performedAt}}', '{{inspection.summary}}', '{{inspection.propertyCode}}', '{{inspection.propertyAddress}}', '{{inspection.renterName}}', '{{inspection.inspectorName}}',
] as const;
