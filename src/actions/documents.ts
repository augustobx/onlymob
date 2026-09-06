'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction } from '@/lib/tenant-guard';
import { requirePermission } from '@/lib/permissions';
import { getDocumentTemplate, listDocuments, listDocumentTemplates, registerDocument, saveDocumentTemplate, setDocumentTemplateActive } from '@/lib/document-center';

const TemplateSchema=z.object({id:z.string().optional().nullable(),name:z.string().min(2).max(160),category:z.string().min(2).max(60),description:z.string().max(3000).optional().nullable(),body:z.string().min(5).max(100000),isActive:z.boolean().default(true)});
const RelationsSchema=z.object({propertyId:z.string().optional().nullable(),renterId:z.string().optional().nullable(),propertyLeaseId:z.string().optional().nullable(),maintenanceRequestId:z.string().optional().nullable(),inspectionId:z.string().optional().nullable(),contactId:z.string().optional().nullable(),dealId:z.string().optional().nullable(),paymentId:z.string().optional().nullable(),ownerSettlementId:z.string().optional().nullable()});
const RegisterDocumentSchema=RelationsSchema.extend({category:z.string().min(2).max(60),fileName:z.string().min(2).max(255),fileUrl:z.string().min(1).max(500),mimeType:z.string().max(100).optional().nullable(),notes:z.string().max(5000).optional().nullable()});
const GenerateDocumentSchema=RelationsSchema.extend({templateId:z.string().min(1),fileName:z.string().min(2).max(255).optional().nullable(),notes:z.string().max(5000).optional().nullable()});
type Relations=z.infer<typeof RelationsSchema>;

function date(value:Date|null|undefined){return value?value.toLocaleDateString('es-AR'):''}
function money(value:unknown,currency='ARS'){if(value==null)return'';return`${currency} ${Number(value).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}`}
function safeFileName(value:string){const cleaned=value.trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ');return cleaned.toLowerCase().endsWith('.pdf')?cleaned:`${cleaned}.pdf`}
function renderTemplate(body:string,variables:Record<string,string>){return body.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g,(match,key:string)=>variables[key]??match)}

async function loadRelations(tenantId:string,relations:Relations){
 const[property,renter,lease,maintenance,inspection,contact,deal,payment,settlement]=await Promise.all([
  relations.propertyId?platformPrisma.property.findFirst({where:{id:relations.propertyId,tenantId,archivedAt:null}}):null,
  relations.renterId?platformPrisma.propertyRenter.findFirst({where:{id:relations.renterId,tenantId}}):null,
  relations.propertyLeaseId?platformPrisma.propertyLease.findFirst({where:{id:relations.propertyLeaseId,tenantId},include:{property:true,renter:true,guarantor:true}}):null,
  relations.maintenanceRequestId?platformPrisma.maintenanceRequest.findFirst({where:{id:relations.maintenanceRequestId,tenantId},include:{property:true,renter:true,provider:true}}):null,
  relations.inspectionId?platformPrisma.inspection.findFirst({where:{id:relations.inspectionId,tenantId},include:{property:true,renter:true,inspector:true}}):null,
  relations.contactId?platformPrisma.contact.findFirst({where:{id:relations.contactId,tenantId,archivedAt:null}}):null,
  relations.dealId?platformPrisma.deal.findFirst({where:{id:relations.dealId,tenantId},include:{property:true,contact:true,agent:true}}):null,
  relations.paymentId?platformPrisma.payment.findFirst({where:{id:relations.paymentId,tenantId},include:{debt:{include:{renter:true,propertyLease:{include:{property:true}}}}}):null,
  relations.ownerSettlementId?platformPrisma.ownerSettlement.findFirst({where:{id:relations.ownerSettlementId,tenantId},include:{owner:true}}):null,
 ]);
 const checks:Array<[string|null|undefined,unknown,string]>=[[relations.propertyId,property,'Propiedad'],[relations.renterId,renter,'Inquilino'],[relations.propertyLeaseId,lease,'Contrato'],[relations.maintenanceRequestId,maintenance,'Mantenimiento'],[relations.inspectionId,inspection,'Inspección'],[relations.contactId,contact,'Contacto'],[relations.dealId,deal,'Operación'],[relations.paymentId,payment,'Pago'],[relations.ownerSettlementId,settlement,'Liquidación']];
 for(const[id,entity,label]of checks)if(id&&!entity)throw new Error(`${label} no encontrado para esta inmobiliaria.`);
 return{property,renter,lease,maintenance,inspection,contact,deal,payment,settlement};
}

function buildVariables(tenant:{name:string;cuit:string|null;address:string|null;phone:string|null},entities:Awaited<ReturnType<typeof loadRelations>>){
 const{property,renter,lease,maintenance,inspection,contact,deal,payment,settlement}=entities;
 const variables:Record<string,string>={today:new Date().toLocaleDateString('es-AR'),'tenant.name':tenant.name,'tenant.cuit':tenant.cuit||'','tenant.address':tenant.address||'','tenant.phone':tenant.phone||''};
 if(property)Object.assign(variables,{'property.code':property.code,'property.address':property.address,'property.type':property.type,'property.city':property.city||'','property.province':property.province||'','property.operation':property.operation,'property.rentPrice':money(property.rentPrice,property.currency),'property.salePrice':money(property.salePrice,property.currency)});
 if(contact)Object.assign(variables,{'contact.fullName':`${contact.firstName} ${contact.lastName}`,'contact.firstName':contact.firstName,'contact.lastName':contact.lastName,'contact.document':contact.documentNumber||'','contact.cuit':contact.cuit||'','contact.email':contact.email||'','contact.phone':contact.phone||'','contact.address':contact.address||''});
 if(renter)Object.assign(variables,{'renter.fullName':`${renter.firstName} ${renter.lastName}`,'renter.firstName':renter.firstName,'renter.lastName':renter.lastName,'renter.dni':renter.dni,'renter.email':renter.email||'','renter.phone':renter.phone||'','renter.address':renter.address||''});
 if(lease)Object.assign(variables,{'lease.startDate':date(lease.startDate),'lease.endDate':date(lease.endDate),'lease.currentRent':money(lease.currentRent),'lease.deposit':money(lease.deposit),'lease.status':lease.status,'lease.adjustmentMethod':lease.adjustmentMethod||'','lease.adjustmentIndex':lease.adjustmentIndex||'','lease.nextAdjustmentDate':date(lease.nextAdjustmentDate),'lease.propertyCode':lease.property.code,'lease.propertyAddress':lease.property.address,'lease.renterName':`${lease.renter.firstName} ${lease.renter.lastName}`,'lease.renterDni':lease.renter.dni,'lease.guarantorName':lease.guarantor?`${lease.guarantor.firstName} ${lease.guarantor.lastName}`:''});
 if(deal)Object.assign(variables,{'deal.operation':deal.operation,'deal.status':deal.status,'deal.amount':money(deal.amount,deal.currency),'deal.currency':deal.currency,'deal.propertyCode':deal.property.code,'deal.propertyAddress':deal.property.address,'deal.contactName':deal.contact?`${deal.contact.firstName} ${deal.contact.lastName}`:'','deal.agentName':deal.agent?.name||''});
 if(payment)Object.assign(variables,{'payment.amount':money(payment.amount),'payment.date':date(payment.paidAt),'payment.method':payment.method,'payment.reference':payment.reference||'','payment.receiptNumber':payment.receiptNumber||'','payment.renterName':`${payment.debt.renter.firstName} ${payment.debt.renter.lastName}`,'payment.renterDni':payment.debt.renter.dni,'payment.propertyAddress':payment.debt.propertyLease?.property.address||''});
 if(maintenance)Object.assign(variables,{'maintenance.title':maintenance.title,'maintenance.category':maintenance.category,'maintenance.status':maintenance.status,'maintenance.priority':maintenance.priority,'maintenance.description':maintenance.description,'maintenance.propertyCode':maintenance.property.code,'maintenance.propertyAddress':maintenance.property.address,'maintenance.renterName':maintenance.renter?`${maintenance.renter.firstName} ${maintenance.renter.lastName}`:'','maintenance.providerName':maintenance.provider?`${maintenance.provider.firstName} ${maintenance.provider.lastName}`:'','maintenance.actualCost':money(maintenance.actualCost)});
 if(settlement)Object.assign(variables,{'settlement.ownerName':`${settlement.owner.firstName} ${settlement.owner.lastName}`,'settlement.periodStart':date(settlement.periodStart),'settlement.periodEnd':date(settlement.periodEnd),'settlement.grossCollected':money(settlement.grossCollected),'settlement.expensesTotal':money(settlement.expensesTotal),'settlement.commissionTotal':money(settlement.commissionTotal),'settlement.taxesTotal':money(settlement.taxesTotal),'settlement.netAmount':money(settlement.netAmount),'settlement.status':settlement.status});
 if(inspection)Object.assign(variables,{'inspection.type':inspection.type,'inspection.status':inspection.status,'inspection.scheduledAt':inspection.scheduledAt?inspection.scheduledAt.toLocaleString('es-AR'):'','inspection.performedAt':inspection.performedAt?inspection.performedAt.toLocaleString('es-AR'):'','inspection.summary':inspection.summary||'','inspection.propertyCode':inspection.property.code,'inspection.propertyAddress':inspection.property.address,'inspection.renterName':inspection.renter?`${inspection.renter.firstName} ${inspection.renter.lastName}`:'','inspection.inspectorName':inspection.inspector?.name||''});
 return variables;
}

export async function getDocumentCenterDataAction(){
 const{tenant}=await requirePermission('documents','read');
 const[documents,templates,properties,contacts,renters,leases,deals,payments,maintenance,settlements,inspections]=await Promise.all([
  listDocuments(tenant.id),listDocumentTemplates(tenant.id),
  platformPrisma.property.findMany({where:{tenantId:tenant.id,archivedAt:null},select:{id:true,code:true,address:true},orderBy:{code:'asc'}}),
  platformPrisma.contact.findMany({where:{tenantId:tenant.id,archivedAt:null,isActive:true},select:{id:true,firstName:true,lastName:true,documentNumber:true,cuit:true},orderBy:[{lastName:'asc'},{firstName:'asc'}]}),
  platformPrisma.propertyRenter.findMany({where:{tenantId:tenant.id},select:{id:true,firstName:true,lastName:true,dni:true},orderBy:[{lastName:'asc'},{firstName:'asc'}]}),
  platformPrisma.propertyLease.findMany({where:{tenantId:tenant.id},include:{property:{select:{code:true,address:true}},renter:{select:{firstName:true,lastName:true,dni:true}}},orderBy:{createdAt:'desc'}}),
  platformPrisma.deal.findMany({where:{tenantId:tenant.id},include:{property:{select:{code:true,address:true}}},orderBy:{createdAt:'desc'}}),
  platformPrisma.payment.findMany({where:{tenantId:tenant.id},include:{debt:{include:{renter:{select:{firstName:true,lastName:true}}}}},orderBy:{paidAt:'desc'},take:200}),
  platformPrisma.maintenanceRequest.findMany({where:{tenantId:tenant.id},include:{property:{select:{code:true,address:true}}},orderBy:{updatedAt:'desc'}}),
  platformPrisma.ownerSettlement.findMany({where:{tenantId:tenant.id},include:{owner:{select:{firstName:true,lastName:true}}},orderBy:{periodEnd:'desc'}}),
  platformPrisma.inspection.findMany({where:{tenantId:tenant.id},include:{property:{select:{code:true,address:true}}},orderBy:{createdAt:'desc'}}),
 ]);
 return{documents,templates,properties,contacts,renters,leases,deals,payments,maintenance,settlements,inspections};
}

export async function saveDocumentTemplateAction(data:z.input<typeof TemplateSchema>){
 const validated=TemplateSchema.parse(data);const{tenant,session}=await requirePermission('documents',validated.id?'update':'create');
 const templateId=await saveDocumentTemplate({tenantId:tenant.id,id:validated.id||null,name:validated.name.trim(),category:validated.category.trim().toUpperCase(),description:validated.description?.trim()||null,body:validated.body,isActive:validated.isActive});
 await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:validated.id?'DOCUMENT_TEMPLATE_UPDATED':'DOCUMENT_TEMPLATE_CREATED',entityType:'DocumentTemplate',entityId:templateId});revalidatePath('/documentos');return{success:true,templateId};
}

export async function setDocumentTemplateActiveAction(templateId:string,isActive:boolean){
 const{tenant,session}=await requirePermission('documents','manage');await setDocumentTemplateActive(tenant.id,templateId,isActive);await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:isActive?'DOCUMENT_TEMPLATE_ENABLED':'DOCUMENT_TEMPLATE_DISABLED',entityType:'DocumentTemplate',entityId:templateId});revalidatePath('/documentos');return{success:true};
}

export async function registerExternalDocumentAction(data:z.input<typeof RegisterDocumentSchema>){
 const{tenant,session}=await requirePermission('documents','create');const validated=RegisterDocumentSchema.parse(data);await loadRelations(tenant.id,validated);
 const documentId=await registerDocument({...validated,tenantId:tenant.id,category:validated.category.trim().toUpperCase(),fileName:validated.fileName.trim(),fileUrl:validated.fileUrl.trim(),mimeType:validated.mimeType?.trim()||null,notes:validated.notes?.trim()||null});
 await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'DOCUMENT_REGISTERED',entityType:'Document',entityId:documentId,metadata:{category:validated.category}});revalidatePath('/documentos');return{success:true,documentId};
}

export async function generateDocumentFromTemplateAction(data:z.input<typeof GenerateDocumentSchema>){
 const{tenant,session}=await requirePermission('documents','create');const validated=GenerateDocumentSchema.parse(data);const template=await getDocumentTemplate(tenant.id,validated.templateId);if(!template||!Boolean(template.isActive))throw new Error('Plantilla no encontrada o inactiva.');
 const entities=await loadRelations(tenant.id,validated);const variables=buildVariables(tenant,entities);const rendered=renderTemplate(template.body,variables);const documentId=randomUUID();const fileName=safeFileName(validated.fileName?.trim()||`${template.name} ${new Date().toLocaleDateString('es-AR')}`);const downloadUrl=`/api/documents/${documentId}/download`;
 await registerDocument({id:documentId,tenantId:tenant.id,category:template.category,fileName,fileUrl:downloadUrl,mimeType:'application/pdf',source:'GENERATED',contentSnapshot:rendered,notes:validated.notes?.trim()||null,templateId:template.id,propertyId:validated.propertyId||null,renterId:validated.renterId||null,propertyLeaseId:validated.propertyLeaseId||null,maintenanceRequestId:validated.maintenanceRequestId||null,inspectionId:validated.inspectionId||null,contactId:validated.contactId||null,dealId:validated.dealId||null,paymentId:validated.paymentId||null,ownerSettlementId:validated.ownerSettlementId||null});
 await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'DOCUMENT_GENERATED',entityType:'Document',entityId:documentId,metadata:{templateId:template.id,category:template.category}});revalidatePath('/documentos');return{success:true,documentId,downloadUrl};
}
