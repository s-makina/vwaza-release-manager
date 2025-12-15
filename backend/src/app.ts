import fastify from 'fastify';
import { authRoutes } from './modules/auth/auth.routes';
import { jwtPlugin } from './plugins/jwt';

const app = fastify({ logger: true });

app.register(jwtPlugin);
app.register(authRoutes);

export default app;