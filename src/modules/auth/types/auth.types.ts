export type Role = 'USER' | 'PROMOTER' | 'ADMIN' | 'FINANCE' | 'SUPPORT';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}