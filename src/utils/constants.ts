// Centralized environment-driven configuration
const getEnv = (key: string, fallback: string): string => {
  // CRA exposes REACT_APP_* at build time
  // Also support Vite-style import.meta.env for flexibility
  // @ts-ignore
  const viteVal = typeof import.meta !== 'undefined' ? import.meta.env?.[key] : undefined;
  const craVal = (typeof process !== 'undefined' ? (process as any).env?.[key] : undefined) as string | undefined;
  return (viteVal as string | undefined) || craVal || fallback;
};

// utils/constants.ts

export const API_BASE_URL = getEnv(
  "REACT_APP_API_BASE_URL",
  "http://localhost:8000"
);

export const WS_BASE_URL = getEnv(
  "REACT_APP_WS_URL",
  "ws://localhost:3001"
);

export const KANBAN_COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    status: 'To Do' as const,
    color: 'bg-blue-50 border-blue-200',
    tasks: [],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    status: 'In Progress' as const,
    color: 'bg-yellow-50 border-yellow-200',
    tasks: [],
  },
  {
    id: 'done',
    title: 'Done',
    status: 'Done' as const,
    color: 'bg-green-50 border-green-200',
    tasks: [],
  },
];

export const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-red-100 text-red-800',
};

export const USER_ROLES = {
  Admin: 'admin',
  Member: 'member',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
} as const;
