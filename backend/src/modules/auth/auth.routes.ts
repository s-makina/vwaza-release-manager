import { FastifyInstance } from 'fastify';
import { registerUser, authenticateUser } from './auth.service';
import { UserRole } from './auth.types';

const registerSchema = {
    body: {
        type: 'object',
        required: ['email', 'password', 'role'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            role: { type: 'string', enum: ['ARTIST', 'ADMIN'] }
        }
    }
};

const loginSchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
        }
    }
};

export async function authRoutes(app: FastifyInstance) {
    app.post<{ Body: { email: string; password: string; role: UserRole } }>(
        '/auth/register',
        { schema: registerSchema },
        async (request, reply) => {
            const { email, password, role } = request.body;

            try {
                const user = await registerUser(email, password, role);
                return user;
            } catch (error: unknown) {
                const maybePgError = error as { code?: string };
                if (maybePgError.code === '23505') { // Unique violation
                    return reply.code(409).send({ message: 'Email already registered' });
                }
                return reply.code(500).send({ message: 'Internal server error' });
            }
        }
    );

    app.post<{ Body: { email: string; password: string } }>(
        '/auth/login',
        { schema: loginSchema },
        async (request, reply) => {
            const { email, password } = request.body;

            const user = await authenticateUser(email, password);
            if (!user) {
                return reply.code(401).send({ message: 'Invalid credentials' });
            }

            const token = app.jwt.sign({
                userId: user.id,
                role: user.role
            });

            return { token };
        }
    );
}