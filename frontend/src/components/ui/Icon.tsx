import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'dashboard'
  | 'documents'
  | 'chat'
  | 'search'
  | 'settings'
  | 'menu'
  | 'close'
  | 'upload'
  | 'arrow-right'
  | 'trash'
  | 'eye'
  | 'sparkles'
  | 'check'
  | 'database'
  | 'alert'
  | 'send'
  | 'plus'
  | 'back'
  | 'file'
  | 'clock';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

const paths: Record<IconName, ReactNode> = {
  dashboard: <path d="M4 5h6v6H4V5Zm10 0h6v4h-6V5ZM4 15h6v4H4v-4Zm10-2h6v6h-6v-6Z" />,
  documents: <path d="M7 3h7l4 4v14H7V3Zm7 0v5h4M10 12h5m-5 4h5" />,
  chat: <path d="M4 5h16v12H9l-5 4V5Zm4 5h8m-8 3h5" />,
  search: <path d="m20 20-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />,
  settings: (
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.1-3.5.9 1.6-2.1 3.6-1.9-.1a8 8 0 0 1-2 1.2l-.9 1.7H9l-.9-1.7a8 8 0 0 1-2-1.2l-1.9.1-2.1-3.6L3 12a8 8 0 0 1 0-2l-.9-1.6 2.1-3.6 1.9.1a8 8 0 0 1 2-1.2L9 2h4.1l.9 1.7a8 8 0 0 1 2 1.2l1.9-.1L20 8.4l-.9 1.6a8 8 0 0 1 0 2Z" />
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  upload: <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />,
  'arrow-right': <path d="M5 12h14m-5-5 5 5-5 5" />,
  trash: <path d="M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m3 0-1 13H7L6 7" />,
  eye: (
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
  ),
  sparkles: (
    <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
  ),
  check: <path d="m5 12 4 4L19 6" />,
  database: (
    <path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6m-16 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  ),
  alert: (
    <path d="M12 8v5m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  ),
  send: <path d="m3 11 18-8-8 18-2-8-8-2Zm8 2 10-10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  file: <path d="M7 3h7l4 4v14H7V3Zm7 0v5h4" />,
  clock: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
};

export function Icon({ name, className = 'size-5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
