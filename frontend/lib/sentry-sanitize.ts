const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
const MAX_STRING = 2000;
const MAX_ARRAY = 50;
const MAX_OBJECT_KEYS = 100;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

function isSensitiveKey(key: string): boolean {
  const n = normalizeKey(key);
  if (n.includes('password')) return true;
  if (n === 'email' || n.endsWith('email')) return true;
  if (
    n === 'phone' ||
    n.endsWith('phone') ||
    n.includes('phonenumber') ||
    n === 'msisdn' ||
    n === 'tel'
  )
    return true;
  if (n.includes('authorization')) return true;
  if (n.includes('apikey') || n === 'key') return true;
  if (n.includes('cookie')) return true;
  if (n === 'cvv' || n === 'cvc') return true;
  if (n.includes('creditcard') || n === 'cardnumber') return true;
  if (n === 'token' || n === 'accesstoken' || n === 'refreshtoken' || n === 'idtoken') return true;
  if (n === 'secret' || n.endsWith('secret')) return true;
  return false;
}

export function sanitizeForSentryExtra(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[max_depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING) {
      return `${value.slice(0, MAX_STRING)}…[truncated]`;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item) => sanitizeForSentryExtra(item, depth + 1));
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let i = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (i >= MAX_OBJECT_KEYS) {
        out.__truncatedKeys = true;
        break;
      }
      out[k] = isSensitiveKey(k) ? REDACTED : sanitizeForSentryExtra(v, depth + 1);
      i += 1;
    }
    return out;
  }
  return String(value);
}
