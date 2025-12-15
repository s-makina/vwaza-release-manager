export type UserRole = 'ARTIST' | 'ADMIN';

export interface JwtPayload {
    userId: string;
    role: UserRole;
}
