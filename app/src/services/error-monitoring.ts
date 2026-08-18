type ErrorContext = {
  surface?: string;
};

type ErrorRecord = {
  fingerprint: string;
  message: string;
  name: string;
  occurredAt: string;
  path: string;
  surface: string;
};

const STORAGE_KEY = 'alive:error-log:v1';
const MAX_RECORDS = 20;
let monitoringInstalled = false;

function normalizeError(reason: unknown) {
  if (reason instanceof Error) {
    return { name: reason.name || 'Error', message: reason.message || 'Unknown error' };
  }
  if (typeof reason === 'string') return { name: 'Error', message: reason };
  return { name: 'UnknownError', message: 'Unexpected non-error rejection' };
}

function fingerprint(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `alive-${Math.abs(hash)}`;
}

export function reportError(reason: unknown, context: ErrorContext = {}) {
  const normalized = normalizeError(reason);
  const record: ErrorRecord = {
    fingerprint: fingerprint(`${normalized.name}:${normalized.message}`),
    message: normalized.message.slice(0, 240),
    name: normalized.name,
    occurredAt: new Date().toISOString(),
    path: window.location.pathname,
    surface: context.surface ?? 'web',
  };

  console.error('[ALIVE]', record, reason);

  try {
    const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as ErrorRecord[];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, record].slice(-MAX_RECORDS)));
  } catch {
    // Observability must never interfere with the user flow.
  }
}

export function initGlobalErrorMonitoring() {
  if (monitoringInstalled || typeof window === 'undefined') return;
  monitoringInstalled = true;

  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, { surface: 'window' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { surface: 'promise' });
  });
}
