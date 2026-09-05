const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL || '';

export function isAdmin(email: string): boolean {
  if (!email || !ADMIN_EMAIL) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export { ADMIN_EMAIL };
