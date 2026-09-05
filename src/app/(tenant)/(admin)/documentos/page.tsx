import { Header } from '@/components/layout/header';
import { getDocumentCenterDataAction } from '@/actions/documents';
import { DocumentCenterClient } from './document-center-client';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const data = await getDocumentCenterDataAction();

  return (
    <div>
      <Header
        title="Documentos & Plantillas"
        subtitle="Repositorio central, generación de PDFs y documentos vinculados a cada operación"
      />
      <div className="p-8 max-w-7xl mx-auto">
        <DocumentCenterClient data={data} />
      </div>
    </div>
  );
}
