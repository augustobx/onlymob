import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenant-guard';
import { getGeneratedDocument } from '@/lib/document-center';
import { buildTextPdf } from '@/lib/simple-pdf';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenant } = await requireTenantAdmin();
    const { id } = await params;
    const document = await getGeneratedDocument(tenant.id, id);

    if (!document) {
      return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
    }
    if (document.source !== 'GENERATED' || !document.contentSnapshot) {
      return NextResponse.json({ error: 'El documento no tiene contenido PDF generado.' }, { status: 400 });
    }

    const title = document.fileName.replace(/\.pdf$/i, '');
    const pdf = buildTextPdf(title, document.contentSnapshot);
    const fileName = document.fileName.replace(/["\r\n]/g, '').trim() || 'documento.pdf';

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[document-download]', error);
    return NextResponse.json({ error: 'No se pudo generar el documento.' }, { status: 500 });
  }
}
