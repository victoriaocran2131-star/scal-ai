const ADMIN_EMAIL = 'victoria2131@gmail.com';
const ADMIN_PASSWORD = 'Education2132';

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
