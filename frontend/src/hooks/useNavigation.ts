import { useEffect, useState } from 'react';

export type Page = 'dashboard' | 'documents' | 'chat' | 'search' | 'settings' | 'document-detail';

export interface AppRoute {
  page: Page;
  documentId: string | null;
}

function readRoute(): AppRoute {
  const value = window.location.hash.replace(/^#\/?/, '');
  const [page, id] = value.split('/');
  if (page === 'documents' && id)
    return { page: 'document-detail', documentId: decodeURIComponent(id) };
  if (page === 'documents' || page === 'chat' || page === 'search' || page === 'settings') {
    return { page, documentId: null };
  }
  return { page: 'dashboard', documentId: null };
}

export function useNavigation() {
  const [route, setRoute] = useState<AppRoute>(readRoute);

  useEffect(() => {
    const handleChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  const navigate = (page: Exclude<Page, 'document-detail'>, documentId?: string) => {
    window.location.hash =
      page === 'documents' && documentId ? `documents/${encodeURIComponent(documentId)}` : page;
  };

  return { route, navigate };
}
