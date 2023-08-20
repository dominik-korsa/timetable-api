import {TypeBoxTypeProvider} from "@fastify/type-provider-typebox";
import Fastify from 'fastify';
import {Type} from "@sinclair/typebox";
import FastifySwagger from '@fastify/swagger';
import FastifySwaggerUi from '@fastify/swagger-ui';
import FastifyEtag from '@fastify/etag';
import {buildRedisStorage, RspoId, School} from "@timetable-api/common";
import {getSchoolById, getSchoolBySpecifier, redisClient, setVersion} from "./redis.js";
import { OptivumParser } from "@timetable-api/optivum-scrapper";
import {setupCache} from "axios-cache-interceptor";
import Axios from "axios";

const fastify = Fastify({
    logger: true
}).withTypeProvider<TypeBoxTypeProvider>();

export async function startServer() {
    await fastify.register(FastifySwagger);
    await fastify.register(FastifySwaggerUi, {
        prefix: '/docs'
    });
    await fastify.register(FastifyEtag);

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
    const axios = setupCache(Axios, {
        storage: buildRedisStorage(redisClient),
    });

    await redisClient.connect();
    const parser = new OptivumParser("http://plan.technikum19.edu.pl/", axios);
    const parsed = await parser.parse();

    await setVersion('lorem', '2137', {
        data: parsed.data,
        lastCheck: '',
        lastCheckFailed: false,
        nextCheck: '',
    })

    console.log(JSON.stringify(parsed, null, 2));
    await startServer();
}

start().catch((error) => {
    console.error(error);
    process.exit(1);
});
