import { Header } from '@/components/layout/header';
import { getDocumentCenterDataAction } from '@/actions/documents';
import { getDocumentWorkflowAction } from '@/actions/document-workflow';
import { DocumentCenterClient } from './document-center-client';
import { DocumentWorkflowPanel } from './document-workflow-panel';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const [data, workflow] = await Promise.all([
    getDocumentCenterDataAction(),
    getDocumentWorkflowAction(),
  ]);
  const serializedData = JSON.parse(JSON.stringify(data));

  return (
    <div>
      <Header title="Documentos & Plantillas" subtitle="Repositorio, PDFs, versiones, trazabilidad y firma" />
      <main className="app-page"><div className="page-container">
        <DocumentWorkflowPanel documents={workflow as any[]} />
        <DocumentCenterClient data={serializedData} />
      </div></main>
    </div>
  );
}
