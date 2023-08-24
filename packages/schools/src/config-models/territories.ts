import { Static, Type } from '@fastify/type-provider-typebox';

export const TerritoriesConfig = Type.Object({
    duplicateCounties: Type.Array(
        Type.String({
            pattern: '^\\d{2}(?:[0-5]\\d|60)$',
        }),
    ),
    duplicateTowns: Type.Array(
        Type.String({
            pattern: '^\\d{2}(?:[0-5]\\d|60)\\d{2}[14]$',
        }),
    ),
});
export type TerritoriesConfig = Static<typeof TerritoriesConfig>;
