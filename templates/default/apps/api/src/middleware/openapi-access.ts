import { type RequestHandler } from 'express';

const localhostAddresses = new Set(['127.0.0.1', '::1']);

export function restrictOpenApiAccess(allowlist = process.env.OPENAPI_ALLOWLIST): RequestHandler {
  return (req, res, next) => {
    if (isOpenApiAddressAllowed(req.ip, allowlist)) {
      next();
      return;
    }

    res.status(403).json({ error: 'OpenAPI endpoint is not available from this address' });
  };
}

export function isOpenApiAddressAllowed(address: string | undefined, allowlist = '') {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return false;
  if (localhostAddresses.has(normalizedAddress)) return true;

  return parseAllowlist(allowlist).some((entry) => matchesAllowlistEntry(normalizedAddress, entry));
}

function parseAllowlist(allowlist: string) {
  return allowlist
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function matchesAllowlistEntry(address: string, entry: string) {
  if (entry.includes('/')) return matchesCidr(address, entry);
  return address === normalizeAddress(entry);
}

function matchesCidr(address: string, cidr: string) {
  const [range, bitsText] = cidr.split('/');
  const bits = Number(bitsText);
  const addressNumber = ipv4ToNumber(address);
  const rangeNumber = ipv4ToNumber(normalizeAddress(range));

  if (addressNumber === undefined || rangeNumber === undefined || !Number.isInteger(bits)) {
    return false;
  }
  if (bits < 0 || bits > 32) return false;

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (addressNumber & mask) === (rangeNumber & mask);
}

function normalizeAddress(address: string | undefined) {
  if (!address) return undefined;
  if (address.startsWith('::ffff:')) return address.slice('::ffff:'.length);
  return address;
}

function ipv4ToNumber(address: string | undefined) {
  if (!address) return undefined;
  const parts = address.split('.');
  if (parts.length !== 4) return undefined;

  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return undefined;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return undefined;
    value = (value << 8) + octet;
  }

  return value >>> 0;
}
