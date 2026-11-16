import { ChatPanel } from './components/ChatPanel';
import { SemanticSearchPanel } from './components/SemanticSearchPanel';
import { FeedbackBanner } from './components/ui/FeedbackBanner';
import { Icon } from './components/ui/Icon';
import { useDocuments } from './hooks/useDocuments';
import { useNavigation } from './hooks/useNavigation';
import { AppShell } from './layouts/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { route, navigate } = useNavigation();
  const documents = useDocuments();

  return (
    <AppShell page={route.page} onNavigate={(page) => navigate(page)}>
      {documents.message && (
        <div className="mb-6 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <FeedbackBanner message={documents.message} />
          </div>
          <button
            type="button"
            onClick={documents.clearMessage}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss message"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      )}

      {route.page === 'dashboard' && (
        <DashboardPage
          documents={documents.documents}
          loading={documents.loading}
          uploading={documents.uploading}
          uploadProgress={documents.uploadProgress}
          onUpload={(file) => void documents.upload(file)}
          onNavigate={(page) => navigate(page)}
          onOpenDocument={(id) => navigate('documents', id)}
        />
      )}
      {route.page === 'documents' && (
        <DocumentsPage
          documents={documents.documents}
          loading={documents.loading}
          uploading={documents.uploading}
          uploadProgress={documents.uploadProgress}
          deletingId={documents.deletingId}
          onUpload={(file) => void documents.upload(file)}
          onOpen={(id) => navigate('documents', id)}
          onDelete={documents.remove}
        />
      )}
      {route.page === 'document-detail' && route.documentId && (
        <DocumentDetailPage
          documentId={route.documentId}
          indexing={documents.indexingId === route.documentId}
          onBack={() => navigate('documents')}
          onIndex={documents.index}
        />
      )}
      {route.page === 'chat' && (
        <ChatPanel
          documents={documents.documents}
          uploading={documents.uploading}
          uploadProgress={documents.uploadProgress}
          indexingId={documents.indexingId}
          onUploadAndIndex={documents.uploadAndIndex}
          onIndexDocument={documents.index}
          onOpenDocument={(id) => navigate('documents', id)}
        />
      )}
      {route.page === 'search' && <SemanticSearchPanel documents={documents.documents} />}
      {route.page === 'settings' && <SettingsPage />}
    </AppShell>
  );
}
