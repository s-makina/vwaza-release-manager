import { FastifyInstance } from 'fastify';
import { registerUser, authenticateUser } from './auth.service';

export async function authRoutes(app: FastifyInstance) {
    app.post('/auth/register', async (request, reply) => {
        const { email, password, role } = request.body as any;

        try {
            const user = await registerUser(email, password, role);
            return user;
        } catch (error: any) {
            if (error.code === '23505') { // Unique violation
                return reply.code(400).send({ message: 'Email already registered' });
            }
            return reply.code(500).send({ message: 'Internal server error' });
        }
    });

    app.post('/auth/login', async (request, reply) => {
        const { email, password } = request.body as any;

        const user = await authenticateUser(email, password);
        if (!user) {
            return reply.code(401).send({ message: 'Invalid credentials' });
        }

        const token = app.jwt.sign({
            userId: user.id,
            role: user.role
        });

        return { token };
    });
}