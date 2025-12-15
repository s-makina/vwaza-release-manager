import { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(role: 'ARTIST' | 'ADMIN') {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user: any = (request as any).user;

        if (!user || user.role !== role) {
            return reply.code(403).send({ message: 'Forbidden' });
        }
    };
}