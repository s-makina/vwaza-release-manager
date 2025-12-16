import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config/env';

export async function jwtPlugin(app: FastifyInstance) {
    app.register(fastifyJwt, {
        secret: config.jwtSecret
    });

    app.decorate(
        'authenticate',
        async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
            try {
                await request.jwtVerify();
            } catch {
                await reply.code(401).send({ message: 'Unauthorized' });
                return;
            }
        }
    );
}