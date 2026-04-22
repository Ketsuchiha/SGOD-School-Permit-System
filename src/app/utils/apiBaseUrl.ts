export const resolveApiBaseUrl = (rawValue?: string): string => {
  const raw = (rawValue || '').trim();

  if (!raw) {
    return 'http://localhost:8000';
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }

  if (/^(localhost|127\.0\.0\.1)(?::\d+)?(?:\/.*)?$/i.test(raw)) {
    return `http://${raw}`.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    return new URL(raw, window.location.origin).toString().replace(/\/+$/, '');
  }

  return raw.replace(/\/+$/, '');
};