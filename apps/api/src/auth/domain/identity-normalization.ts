export function normalizedUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizedIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}
