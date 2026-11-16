import { useState, type ReactNode } from 'react';

import { Icon, type IconName } from '../components/ui/Icon';
import type { Page } from '../hooks/useNavigation';

interface NavItem {
  page: Exclude<Page, 'document-detail'>;
  label: string;
  icon: IconName;
}

const navigation: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { page: 'documents', label: 'Documents', icon: 'documents' },
  { page: 'chat', label: 'AI Chat', icon: 'chat' },
  { page: 'search', label: 'Search', icon: 'search' },
  { page: 'settings', label: 'Settings', icon: 'settings' },
];

export function AppShell({
  page,
  onNavigate,
  children,
}: {
  page: Page;
  onNavigate: (page: Exclude<Page, 'document-detail'>) => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activePage = page === 'document-detail' ? 'documents' : page;

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      <div className="flex h-18 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500 font-black text-white">
          D
        </div>
        <div>
          <p className="text-sm font-semibold text-white">DocuSense AI</p>
          <p className="text-[11px] text-slate-500">Document intelligence</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Primary navigation">
        {navigation.map((item) => {
          const active = activePage === item.page;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => {
                onNavigate(item.page);
                setMobileOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-400 hover:bg-white/6 hover:text-white'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} className="size-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/5 px-3 py-3">
          <p className="text-xs font-semibold text-white">Local workspace</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Gemini-powered document retrieval
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative h-full w-72 max-w-[85vw] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </button>
          <p className="text-sm font-semibold text-slate-950">DocuSense AI</p>
          <div className="size-9" aria-hidden="true" />
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
