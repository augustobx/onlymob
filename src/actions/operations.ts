'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { platformPrisma } from '@/lib/prisma-core';
import { auditTenantAction } from '@/lib/tenant-guard';
import { requirePermission } from '@/lib/permissions';
import { assertTenantPlanLimit } from '@/lib/saas';

const PUBLICATION_STATUSES = ['DRAFT','PUBLISHED','PAUSED','ENDED'] as const;
const RESERVATION_STATUSES = ['PENDING','CONFIRMED','EXPIRED','CANCELED','CONVERTED'] as const;
const DEAL_STATUSES = ['OPEN','NEGOTIATION','WON','LOST','CANCELED'] as const;
const OPERATIONS = ['RENT','SALE','TEMPORARY_RENT','MANAGEMENT'] as const;

function optionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Fecha inválida.');
  return date;
}

async function assertProperty(tenantId: string, propertyId: string) {
  const property = await platformPrisma.property.findFirst({ where: { id: propertyId, tenantId, archivedAt: null, status: { not: 'ARCHIVADO' } } });
  if (!property) throw new Error('Propiedad no encontrada.');
  return property;
}
async function assertContact(tenantId: string, contactId: string) {
  const contact = await platformPrisma.contact.findFirst({ where: { id: contactId, tenantId, archivedAt: null } });
  if (!contact) throw new Error('Contacto no encontrado.');
  return contact;
}
async function assertAgent(tenantId: string, agentId?: string | null) {
  if (!agentId) return null;
  const user = await platformPrisma.user.findFirst({ where: { id: agentId, tenantId, isActive: true } });
  if (!user) throw new Error('Agente no encontrado.');
  return user;
}
async function assertLead(tenantId: string, leadId?: string | null) {
  if (!leadId) return null;
  const lead = await platformPrisma.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) throw new Error('Lead no encontrado.');
  return lead;
}

function calculateCompleteness(property: { address:string; city:string|null; type:string; operation:string; rooms:number|null; bedrooms:number|null; bathrooms:number|null; sqm:unknown; rentPrice:unknown; salePrice:unknown; publicDescription:string|null; coverImageUrl:string|null; amenities:unknown }) {
  const checks=[!!property.address,!!property.city,!!property.type,!!property.operation,property.rooms!=null,property.bedrooms!=null,property.bathrooms!=null,property.sqm!=null,property.operation==='SALE'?property.salePrice!=null:property.rentPrice!=null,!!property.publicDescription,!!property.coverImageUrl,Array.isArray(property.amenities)&&property.amenities.length>0];
  return Math.round((checks.filter(Boolean).length/checks.length)*100);
}

export async function getOperationsDataAction() {
  const { tenant } = await requirePermission('operations','read');
  const [publications,reservations,deals,properties,contacts,leads,users,leases]=await Promise.all([
    platformPrisma.publication.findMany({where:{tenantId:tenant.id},include:{property:{select:{id:true,code:true,address:true,operation:true,commercialStatus:true}}},orderBy:{updatedAt:'desc'}}),
    platformPrisma.reservation.findMany({where:{tenantId:tenant.id},include:{property:{select:{id:true,code:true,address:true,operation:true}},contact:{select:{id:true,firstName:true,lastName:true}},lead:{select:{id:true,title:true}},agent:{select:{id:true,name:true}},deal:{select:{id:true,status:true}}},orderBy:{createdAt:'desc'}}),
    platformPrisma.deal.findMany({where:{tenantId:tenant.id},include:{property:{select:{id:true,code:true,address:true}},contact:{select:{id:true,firstName:true,lastName:true}},lead:{select:{id:true,title:true}},agent:{select:{id:true,name:true}},propertyLease:{select:{id:true,startDate:true,endDate:true}}},orderBy:{updatedAt:'desc'}}),
    platformPrisma.property.findMany({where:{tenantId:tenant.id,archivedAt:null,status:{not:'ARCHIVADO'}},orderBy:{code:'asc'}}),
    platformPrisma.contact.findMany({where:{tenantId:tenant.id,archivedAt:null,isActive:true},select:{id:true,firstName:true,lastName:true,email:true,phone:true},orderBy:[{lastName:'asc'},{firstName:'asc'}]}),
    platformPrisma.lead.findMany({where:{tenantId:tenant.id,status:{notIn:['WON','LOST']}},select:{id:true,title:true,contactId:true},orderBy:{updatedAt:'desc'}}),
    platformPrisma.user.findMany({where:{tenantId:tenant.id,isActive:true},select:{id:true,name:true},orderBy:{name:'asc'}}),
    platformPrisma.propertyLease.findMany({where:{tenantId:tenant.id},include:{property:{select:{code:true,address:true}}},orderBy:{createdAt:'desc'}}),
  ]);
  return {
    publications,
    reservations:reservations.map((r)=>({...r,amount:Number(r.amount),commissionAmount:r.commissionAmount?Number(r.commissionAmount):null})),
    deals:deals.map((d)=>({...d,amount:d.amount?Number(d.amount):null,commissionAmount:d.commissionAmount?Number(d.commissionAmount):null})),
    properties:properties.map((p)=>({...p,baseRent:p.baseRent?Number(p.baseRent):null,rentPrice:p.rentPrice?Number(p.rentPrice):null,salePrice:p.salePrice?Number(p.salePrice):null,sqm:p.sqm?Number(p.sqm):null})),
    contacts,leads,users,leases,
  };
}

export async function savePublicationAction(data:{id?:string;propertyId:string;channel:string;status?:typeof PUBLICATION_STATUSES[number];url?:string;notes?:string}) {
  const { tenant, session } = await requirePermission('operations',data.id?'update':'create');
  const channel=data.channel.trim(); if(!channel)throw new Error('Indicá el canal de publicación.');
  const property=await assertProperty(tenant.id,data.propertyId); const status=data.status||'DRAFT'; const completenessScore=calculateCompleteness(property);
  const payload={propertyId:property.id,channel,status,url:data.url?.trim()||null,notes:data.notes?.trim()||null,completenessScore,publishedAt:status==='PUBLISHED'?new Date():undefined,unpublishedAt:status==='ENDED'?new Date():null};

  let existing = data.id
    ? await platformPrisma.publication.findFirst({where:{id:data.id,tenantId:tenant.id}})
    : await platformPrisma.publication.findFirst({where:{tenantId:tenant.id,propertyId:property.id,channel}});
  if(data.id&&!existing)throw new Error('Publicación no encontrada.');

  let publication;
  if(existing){ publication=await platformPrisma.publication.update({where:{id:existing.id},data:payload}); }
  else {
    await assertTenantPlanLimit(tenant.id,'publications');
    publication=await platformPrisma.publication.create({data:{tenantId:tenant.id,...payload}});
  }

  if(status==='PUBLISHED')await platformPrisma.property.update({where:{id:property.id},data:{publishedAt:new Date(),commercialStatus:property.commercialStatus==='DRAFT'?'AVAILABLE':property.commercialStatus}});
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'PUBLICATION_SAVED',entityType:'Publication',entityId:publication.id,metadata:{channel:publication.channel,status}});
  revalidatePath('/operaciones');revalidatePath(`/propiedades/${property.id}`);revalidatePath('/dashboard');
  return{success:true,publicationId:publication.id,completenessScore};
}

const ReservationSchema=z.object({propertyId:z.string().min(1),contactId:z.string().min(1),leadId:z.string().optional().nullable(),agentId:z.string().optional().nullable(),amount:z.number().nonnegative(),currency:z.string().min(2).max(10).default('ARS'),status:z.enum(RESERVATION_STATUSES).default('PENDING'),expiresAt:z.string().optional().nullable(),conditions:z.string().max(6000).optional().nullable(),commissionAmount:z.number().nonnegative().optional().nullable(),notes:z.string().max(6000).optional().nullable()});

export async function saveReservationAction(data:z.input<typeof ReservationSchema>&{id?:string}) {
  const {tenant,session}=await requirePermission('operations',data.id?'update':'create'); const validated=ReservationSchema.parse(data);
  const[property,contact]=await Promise.all([assertProperty(tenant.id,validated.propertyId),assertContact(tenant.id,validated.contactId)]);await Promise.all([assertLead(tenant.id,validated.leadId),assertAgent(tenant.id,validated.agentId)]);
  const reservation=await platformPrisma.$transaction(async(tx)=>{
    const payload={propertyId:property.id,contactId:contact.id,leadId:validated.leadId||null,agentId:validated.agentId||null,amount:validated.amount,currency:validated.currency.toUpperCase(),status:validated.status,expiresAt:optionalDate(validated.expiresAt),conditions:validated.conditions?.trim()||null,commissionAmount:validated.commissionAmount??null,notes:validated.notes?.trim()||null,convertedAt:validated.status==='CONVERTED'?new Date():null};
    let saved;if(data.id){const existing=await tx.reservation.findFirst({where:{id:data.id,tenantId:tenant.id}});if(!existing)throw new Error('Reserva no encontrada.');saved=await tx.reservation.update({where:{id:existing.id},data:payload});}else saved=await tx.reservation.create({data:{tenantId:tenant.id,...payload}});
    if(['PENDING','CONFIRMED'].includes(validated.status))await tx.property.update({where:{id:property.id},data:{commercialStatus:'RESERVED'}});
    if(validated.leadId&&['PENDING','CONFIRMED'].includes(validated.status))await tx.lead.update({where:{id:validated.leadId},data:{status:'RESERVATION'}});
    return saved;
  });
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:data.id?'RESERVATION_UPDATED':'RESERVATION_CREATED',entityType:'Reservation',entityId:reservation.id,metadata:{propertyId:property.id,contactId:contact.id,status:reservation.status}});
  revalidatePath('/operaciones');revalidatePath('/crm');revalidatePath('/propiedades');revalidatePath('/dashboard');return{success:true,reservationId:reservation.id};
}

export async function setReservationStatusAction(reservationId:string,status:typeof RESERVATION_STATUSES[number]) {
  const{tenant,session}=await requirePermission('operations','update');
  const reservation=await platformPrisma.reservation.findFirst({where:{id:reservationId,tenantId:tenant.id},include:{deal:true}});if(!reservation)throw new Error('Reserva no encontrada.');if(reservation.deal&&status!=='CONVERTED')throw new Error('La reserva ya fue convertida en operación.');
  await platformPrisma.$transaction(async(tx)=>{await tx.reservation.update({where:{id:reservation.id},data:{status,convertedAt:status==='CONVERTED'?new Date():null}});if(['CANCELED','EXPIRED'].includes(status)){const active=await tx.reservation.count({where:{tenantId:tenant.id,propertyId:reservation.propertyId,id:{not:reservation.id},status:{in:['PENDING','CONFIRMED']}}});if(active===0)await tx.property.update({where:{id:reservation.propertyId},data:{commercialStatus:'AVAILABLE'}});}});
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'RESERVATION_STATUS_CHANGED',entityType:'Reservation',entityId:reservation.id,metadata:{status}});revalidatePath('/operaciones');revalidatePath('/crm');revalidatePath('/propiedades');return{success:true};
}

export async function convertReservationToDealAction(reservationId:string) {
  const{tenant,session}=await requirePermission('operations','create');
  const reservation=await platformPrisma.reservation.findFirst({where:{id:reservationId,tenantId:tenant.id},include:{property:true,deal:true}});if(!reservation)throw new Error('Reserva no encontrada.');if(reservation.deal)return{success:true,dealId:reservation.deal.id};if(['CANCELED','EXPIRED'].includes(reservation.status))throw new Error('No se puede convertir una reserva cancelada o vencida.');
  const deal=await platformPrisma.$transaction(async(tx)=>{const created=await tx.deal.create({data:{tenantId:tenant.id,propertyId:reservation.propertyId,contactId:reservation.contactId,leadId:reservation.leadId,reservationId:reservation.id,agentId:reservation.agentId,operation:reservation.property.operation,status:'NEGOTIATION',amount:reservation.amount,currency:reservation.currency,commissionAmount:reservation.commissionAmount,notes:reservation.notes}});await tx.reservation.update({where:{id:reservation.id},data:{status:'CONVERTED',convertedAt:new Date()}});await tx.property.update({where:{id:reservation.propertyId},data:{commercialStatus:'UNDER_NEGOTIATION'}});if(reservation.leadId)await tx.lead.update({where:{id:reservation.leadId},data:{status:'NEGOTIATION'}});return created;});
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'RESERVATION_CONVERTED_TO_DEAL',entityType:'Deal',entityId:deal.id,metadata:{reservationId}});revalidatePath('/operaciones');revalidatePath('/crm');revalidatePath('/propiedades');revalidatePath('/dashboard');return{success:true,dealId:deal.id};
}

const DealSchema=z.object({propertyId:z.string().min(1),contactId:z.string().optional().nullable(),leadId:z.string().optional().nullable(),agentId:z.string().optional().nullable(),operation:z.enum(OPERATIONS),status:z.enum(DEAL_STATUSES).default('OPEN'),amount:z.number().nonnegative().optional().nullable(),currency:z.string().min(2).max(10).default('ARS'),commissionAmount:z.number().nonnegative().optional().nullable(),notes:z.string().max(6000).optional().nullable()});

export async function saveDealAction(data:z.input<typeof DealSchema>&{id?:string}) {
  const{tenant,session}=await requirePermission('operations',data.id?'update':'create');const validated=DealSchema.parse(data);const property=await assertProperty(tenant.id,validated.propertyId);if(validated.contactId)await assertContact(tenant.id,validated.contactId);await Promise.all([assertLead(tenant.id,validated.leadId),assertAgent(tenant.id,validated.agentId)]);
  const payload={propertyId:property.id,contactId:validated.contactId||null,leadId:validated.leadId||null,agentId:validated.agentId||null,operation:validated.operation,status:validated.status,amount:validated.amount??null,currency:validated.currency.toUpperCase(),commissionAmount:validated.commissionAmount??null,notes:validated.notes?.trim()||null,closedAt:['WON','LOST','CANCELED'].includes(validated.status)?new Date():null};
  let deal;if(data.id){const existing=await platformPrisma.deal.findFirst({where:{id:data.id,tenantId:tenant.id}});if(!existing)throw new Error('Operación no encontrada.');deal=await platformPrisma.deal.update({where:{id:existing.id},data:payload});}else deal=await platformPrisma.deal.create({data:{tenantId:tenant.id,...payload}});
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:data.id?'DEAL_UPDATED':'DEAL_CREATED',entityType:'Deal',entityId:deal.id});revalidatePath('/operaciones');revalidatePath('/crm');revalidatePath('/dashboard');return{success:true,dealId:deal.id};
}

export async function setDealStatusAction(dealId:string,status:typeof DEAL_STATUSES[number]) {
  const{tenant,session}=await requirePermission('operations','update');const deal=await platformPrisma.deal.findFirst({where:{id:dealId,tenantId:tenant.id}});if(!deal)throw new Error('Operación no encontrada.');const now=new Date();
  await platformPrisma.$transaction(async(tx)=>{await tx.deal.update({where:{id:deal.id},data:{status,closedAt:['WON','LOST','CANCELED'].includes(status)?now:null}});if(status==='WON'){await tx.property.update({where:{id:deal.propertyId},data:{commercialStatus:'CLOSED'}});if(deal.leadId)await tx.lead.update({where:{id:deal.leadId},data:{status:'WON',closedAt:now}});}else if(['LOST','CANCELED'].includes(status)){await tx.property.update({where:{id:deal.propertyId},data:{commercialStatus:'AVAILABLE'}});if(deal.leadId&&status==='LOST')await tx.lead.update({where:{id:deal.leadId},data:{status:'LOST',closedAt:now,lostReason:'Operación perdida'}});}else await tx.property.update({where:{id:deal.propertyId},data:{commercialStatus:'UNDER_NEGOTIATION'}});});
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'DEAL_STATUS_CHANGED',entityType:'Deal',entityId:deal.id,metadata:{status}});revalidatePath('/operaciones');revalidatePath('/crm');revalidatePath('/propiedades');revalidatePath('/dashboard');return{success:true};
}

export async function linkDealToLeaseAction(dealId:string,propertyLeaseId:string) {
  const{tenant,session}=await requirePermission('operations','update');const[deal,lease]=await Promise.all([platformPrisma.deal.findFirst({where:{id:dealId,tenantId:tenant.id}}),platformPrisma.propertyLease.findFirst({where:{id:propertyLeaseId,tenantId:tenant.id}})]);if(!deal)throw new Error('Operación no encontrada.');if(!lease)throw new Error('Contrato no encontrado.');if(deal.propertyId!==lease.propertyId)throw new Error('El contrato no corresponde a la propiedad de la operación.');
  await platformPrisma.deal.update({where:{id:deal.id},data:{propertyLeaseId:lease.id,status:'WON',closedAt:new Date()}});await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'DEAL_LINKED_TO_LEASE',entityType:'Deal',entityId:deal.id,metadata:{propertyLeaseId:lease.id}});revalidatePath('/operaciones');revalidatePath('/contratos');return{success:true};
}
