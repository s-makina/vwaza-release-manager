import '@fastify/jwt';

declare module 'fastify' {
    interface FastifyRequest {
        jwt: import('@fastify/jwt').JWT;
    }
    export interface FastifyInstance {
        authenticate: (
            request: import('fastify').FastifyRequest,
            reply: import('fastify').FastifyReply
        ) => Promise<void>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT { // payload type is used for signing and verifying
        payload: {
            userId: string;
            role: 'ARTIST' | 'ADMIN';
        }
        user: {
            userId: string;
            role: 'ARTIST' | 'ADMIN';
        }
    }
}
