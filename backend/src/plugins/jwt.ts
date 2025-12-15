import { FastifyInstance, FastifyRequest } from 'fastify';
import { config } from '../config/env';
import { pool } from '../db/pool';

export async function jwtPlugin(app: FastifyInstance) {
    app.register(require('@fastify/jwt'), {
        secret: config.jwtSecret
    });

    app.decorate('authenticate', async function(request: FastifyRequest, reply: any) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.code(401).send({ message: 'Unauthorized' });
        }
    });
}