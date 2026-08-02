/** Internal Supabase identifier only — never shown or collected from players. */
const AUTH_EMAIL_DOMAIN = 'users.enclosure.local';

const USERNAME_PATTERN = /^[0-9_a-z]{3,24}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Maps username → synthetic auth id. Players never see or type this. */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export function mapAuthError(message: string): string {
  console.log('message', message);
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Wrong username or password';
  }
  if (lower.includes('user already registered')) {
    return 'Username is already taken';
  }
  if (lower.includes('email')) {
    return 'Could not sign in. Try again.';
  }

  return message;
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);

  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username: 3–24 chars, a–z, 0–9, underscore';
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }

  return null;
}
