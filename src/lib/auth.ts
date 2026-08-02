/** Internal Supabase identifier only — never shown or collected from players. */
export const AUTH_EMAIL_DOMAIN = 'users.enclosure.local';

const USERNAME_PATTERN = /^[0-9_a-z]{3,24}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Maps username → synthetic auth id. Players never see or type this. */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
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

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Wrong username or password';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered')
  ) {
    return 'Username is already taken';
  }

  return message;
}
