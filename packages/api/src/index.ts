import {TypeBoxTypeProvider} from "@fastify/type-provider-typebox";
import Fastify from 'fastify';
import {Type} from "@sinclair/typebox";
import FastifySwagger from '@fastify/swagger';
import FastifySwaggerUi from '@fastify/swagger-ui';
import {RspoId, School} from "@timetable-api/common";
import {getSchoolById, getSchoolBySpecifier, redisClient} from "./redis.js";

const fastify = Fastify({
    logger: true
}).withTypeProvider<TypeBoxTypeProvider>();

export async function startServer() {
    await fastify.register(FastifySwagger);
    await fastify.register(FastifySwaggerUi, {
        prefix: '/docs'
    });

    fastify.get('/school/rspo/:rspoId', {
        schema: {
            params: Type.Object({
                rspoId: RspoId,
            }),
            response: {
                200: School,
            }
        }
    }, async (req, reply) => {
        const school = await getSchoolById(req.params.rspoId);
        if (school === undefined) return reply.status(404).send();
        return school;
    });

    fastify.get('/school/specifier/:specifier', {
        schema: {
            params: Type.Object({
                specifier: Type.String(),
            }),
            response: {
                200: School,
            }
        }
    }, async (req, reply) => {
        const school = await getSchoolBySpecifier(req.params.specifier);
        if (school === undefined) return reply.status(404).send();
        return school;
    });

    await fastify.ready();
    fastify.swagger();

    await fastify.listen({
        port: 80,
        host: '0.0.0.0',
    });
}

async function start() {
    await redisClient.connect();
    await startServer();
}

start().catch((error) => {
    console.error(error);
    process.exit(1);
});
