export function formatCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}

export function issuerInitial(issuer: string): string {
  return issuer.charAt(0).toUpperCase() || "?";
}

export function sanitizeSecret(secret: string): string {
  return secret.replace(/\s+/g, "").toUpperCase();
}
