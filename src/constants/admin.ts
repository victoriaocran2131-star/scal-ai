const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'victoria2132@gmail.com';
const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_ADMIN_PASSWORD || 'Education2132@';

export function isAdmin(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function isAdminCredentials(email: string, password: string): boolean {
  return (
    email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    password === ADMIN_PASSWORD
  );
}

export { ADMIN_EMAIL, ADMIN_PASSWORD };
