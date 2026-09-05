import { NextRequest,NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { platformPrisma } from '@/lib/prisma-core';
import { resolveTenantContext } from '@/lib/tenant-context';

export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 try{
  const tenant=await resolveTenantContext();const session=await getAdminSession(tenant.id);if(!session)return NextResponse.json({results:[]},{status:401});
  const q=(request.nextUrl.searchParams.get('q')||'').trim().slice(0,100);if(q.length<2)return NextResponse.json({results:[]});
  const[properties,contacts,renters,leads]=await Promise.all([
   platformPrisma.property.findMany({where:{tenantId:tenant.id,archivedAt:null,status:{not:'ARCHIVADO'},OR:[{code:{contains:q}},{address:{contains:q}},{city:{contains:q}},{owners:{some:{contact:{OR:[{firstName:{contains:q}},{lastName:{contains:q}},{documentNumber:{contains:q}},{cuit:{contains:q}}]}}}},{propertyLeases:{some:{renter:{OR:[{firstName:{contains:q}},{lastName:{contains:q}},{dni:{contains:q}}]}}}}]},select:{id:true,code:true,address:true,city:true},take:6}),
   platformPrisma.contact.findMany({where:{tenantId:tenant.id,archivedAt:null,isActive:true,OR:[{firstName:{contains:q}},{lastName:{contains:q}},{companyName:{contains:q}},{documentNumber:{contains:q}},{cuit:{contains:q}},{email:{contains:q}},{phone:{contains:q}}]},select:{id:true,firstName:true,lastName:true,companyName:true,documentNumber:true,cuit:true},take:6}),
   platformPrisma.propertyRenter.findMany({where:{tenantId:tenant.id,status:'ACTIVE',OR:[{firstName:{contains:q}},{lastName:{contains:q}},{dni:{contains:q}},{email:{contains:q}},{phone:{contains:q}}]},select:{id:true,firstName:true,lastName:true,dni:true},take:5}),
   platformPrisma.lead.findMany({where:{tenantId:tenant.id,status:{notIn:['WON','LOST']},OR:[{title:{contains:q}},{contact:{firstName:{contains:q}}},{contact:{lastName:{contains:q}}},{contact:{documentNumber:{contains:q}}}]},include:{contact:{select:{firstName:true,lastName:true}}},take:5,orderBy:{updatedAt:'desc'}}),
  ]);
  return NextResponse.json({results:[
   ...properties.map(p=>({id:p.id,type:'PROPERTY',title:`${p.code} · ${p.address}`,subtitle:p.city||'Propiedad',href:`/propiedades/${p.id}`})),
   ...contacts.map(c=>({id:c.id,type:'CONTACT',title:c.companyName||`${c.lastName}, ${c.firstName}`,subtitle:c.cuit?`CUIT ${c.cuit}`:c.documentNumber?`Doc. ${c.documentNumber}`:'Contacto',href:`/contactos/${c.id}`})),
   ...renters.map(r=>({id:r.id,type:'RENTER',title:`${r.lastName}, ${r.firstName}`,subtitle:`DNI ${r.dni}`,href:`/inquilinos?search=${encodeURIComponent(r.dni)}`})),
   ...leads.map(l=>({id:l.id,type:'LEAD',title:l.title,subtitle:`${l.contact.firstName} ${l.contact.lastName}`,href:`/crm?lead=${l.id}`})),
  ]},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('[global-search]',error);return NextResponse.json({results:[]},{status:500})}
}
