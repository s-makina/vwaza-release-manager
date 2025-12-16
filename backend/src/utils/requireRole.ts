import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, JwtPayload } from '../modules/auth/auth.types';

export function requireRole(role: UserRole) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user as JwtPayload;

        if (!user || user.role !== role) {
            return reply.code(403).send({ message: 'Forbidden' });
        }
    };
}