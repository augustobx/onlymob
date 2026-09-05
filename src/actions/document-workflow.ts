'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { platformPrisma } from '@/lib/prisma-core';
import { requirePermission } from '@/lib/permissions';
import { auditTenantAction } from '@/lib/tenant-guard';

const STATUSES=['DRAFT','GENERATED','SENT','VIEWED','SIGNED','ARCHIVED'] as const;
type WorkflowStatus=typeof STATUSES[number];

export async function getDocumentWorkflowAction(){
  const{tenant}=await requirePermission('documents','read');
  const rows=await platformPrisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`
    SELECT d.id,d.fileName,d.category,d.fileUrl,d.propertyId,d.renterId,d.propertyLeaseId,d.workflowStatus,d.version,d.sentAt,d.viewedAt,d.signedAt,d.archivedAt,d.signatureProvider,d.signatureExternalId,d.uploadedAt,
           p.code AS propertyCode,p.address AS propertyAddress,CONCAT(r.firstName,' ',r.lastName) AS renterName
    FROM Document d
    LEFT JOIN Property p ON p.id=d.propertyId AND p.tenantId=d.tenantId
    LEFT JOIN PropertyRenter r ON r.id=d.renterId AND r.tenantId=d.tenantId
    WHERE d.tenantId=${tenant.id}
    ORDER BY d.uploadedAt DESC LIMIT 500
  `);
  return JSON.parse(JSON.stringify(rows));
}

export async function setDocumentWorkflowStatusAction(documentId:string,status:WorkflowStatus){
  const{tenant,session}=await requirePermission('documents','update');if(!STATUSES.includes(status))throw new Error('Estado documental inválido.');
  const rows=await platformPrisma.$queryRaw<Array<{id:string;propertyId:string|null;renterId:string|null;workflowStatus:string}>>(Prisma.sql`SELECT id,propertyId,renterId,workflowStatus FROM Document WHERE id=${documentId} AND tenantId=${tenant.id} LIMIT 1`);const doc=rows[0];if(!doc)throw new Error('Documento no encontrado.');
  const now=new Date();const sent=status==='SENT'?now:null,viewed=status==='VIEWED'?now:null,signed=status==='SIGNED'?now:null,archived=status==='ARCHIVED'?now:null;
  await platformPrisma.$executeRaw(Prisma.sql`UPDATE Document SET workflowStatus=${status},sentAt=COALESCE(sentAt,${sent}),viewedAt=COALESCE(viewedAt,${viewed}),signedAt=COALESCE(signedAt,${signed}),archivedAt=CASE WHEN ${status}='ARCHIVED' THEN COALESCE(archivedAt,${archived}) ELSE archivedAt END WHERE id=${documentId} AND tenantId=${tenant.id}`);
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'DOCUMENT_UPDATED',entityType:'Document',entityId:documentId,metadata:{propertyId:doc.propertyId||undefined,renterId:doc.renterId||undefined,fromStatus:doc.workflowStatus,toStatus:status}});revalidatePath('/documentos');if(doc.propertyId)revalidatePath(`/propiedades/${doc.propertyId}`);return{success:true};
}

export async function createDocumentVersionAction(documentId:string){
  const{tenant,session}=await requirePermission('documents','create');
  const rows=await platformPrisma.$queryRaw<Array<any>>(Prisma.sql`SELECT * FROM Document WHERE id=${documentId} AND tenantId=${tenant.id} LIMIT 1`);const doc=rows[0];if(!doc)throw new Error('Documento no encontrado.');
  const newId=randomUUID();const version=Number(doc.version||1)+1;
  await platformPrisma.$executeRaw(Prisma.sql`
    INSERT INTO Document (
      id,tenantId,propertyId,renterId,propertyLeaseId,maintenanceRequestId,inspectionId,contactId,dealId,paymentId,ownerSettlementId,
      generatedFromTemplateId,source,contentSnapshot,notes,category,fileName,fileUrl,fileSize,mimeType,uploadedAt,workflowStatus,version
    )
    SELECT ${newId},tenantId,propertyId,renterId,propertyLeaseId,maintenanceRequestId,inspectionId,contactId,dealId,paymentId,ownerSettlementId,
      generatedFromTemplateId,source,contentSnapshot,notes,category,fileName,fileUrl,fileSize,mimeType,${new Date()},'DRAFT',${version}
    FROM Document WHERE id=${documentId} AND tenantId=${tenant.id}
  `);
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'DOCUMENT_CREATED',entityType:'Document',entityId:newId,metadata:{propertyId:doc.propertyId||undefined,renterId:doc.renterId||undefined,previousDocumentId:documentId,version}});revalidatePath('/documentos');return{success:true,documentId:newId,version};
}

export async function requestDocumentSignatureAction(documentId:string){
  const{tenant,session}=await requirePermission('documents','manage');
  const rows=await platformPrisma.$queryRaw<Array<{id:string;fileName:string;fileUrl:string;propertyId:string|null;renterId:string|null}>>(Prisma.sql`SELECT id,fileName,fileUrl,propertyId,renterId FROM Document WHERE id=${documentId} AND tenantId=${tenant.id} LIMIT 1`);const doc=rows[0];if(!doc)throw new Error('Documento no encontrado.');
  const endpoint=process.env.SIGNATURE_PROVIDER_ENDPOINT;const token=process.env.SIGNATURE_PROVIDER_TOKEN;if(!endpoint||!token)throw new Error('Proveedor de firma no configurado.');
  const response=await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({documentId:doc.id,fileName:doc.fileName,fileUrl:doc.fileUrl,tenantId:tenant.id,callbackUrl:`https://${tenant.hostname}/api/integrations/signature/callback`}),signal:AbortSignal.timeout(10000)});
  const payload=await response.json().catch(()=>({})) as any;if(!response.ok)throw new Error(`Proveedor de firma HTTP ${response.status}: ${payload?.message||'error'}`);const externalId=String(payload?.id||payload?.externalId||'');if(!externalId)throw new Error('El proveedor no devolvió identificador de firma.');
  await platformPrisma.$executeRaw(Prisma.sql`UPDATE Document SET workflowStatus='SENT',sentAt=COALESCE(sentAt,${new Date()}),signatureProvider='CUSTOM',signatureExternalId=${externalId},workflowMetadata=${JSON.stringify(payload).slice(0,10000)} WHERE id=${documentId} AND tenantId=${tenant.id}`);
  await auditTenantAction({tenantId:tenant.id,actorUserId:session.userId,action:'DOCUMENT_UPDATED',entityType:'Document',entityId:documentId,metadata:{propertyId:doc.propertyId||undefined,renterId:doc.renterId||undefined,workflowStatus:'SENT',signatureExternalId:externalId}});revalidatePath('/documentos');return{success:true,externalId};
}
