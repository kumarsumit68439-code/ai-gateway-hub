import crypto from 'node:crypto';

export const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');

function make(prefix) {
  const key = prefix + crypto.randomBytes(32).toString('base64url');
  return { key, prefix: key.slice(0, 14) + '…' };
}

// AI gateway key (sk-gw-...)
export const newKey = () => make('sk-gw-');
// Backend data key (bk-live-...)
export const newBackendKey = () => make('bk-live-');
