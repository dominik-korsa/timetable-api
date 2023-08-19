import {ReasonableUrl, RspoId, Slug, VersionId} from "../common.js";
import {Static, Type} from "@sinclair/typebox";

export const SchoolConfigVersionOptivum = Type.Object({
    type: Type.Literal('optivum'),
    migrateFrom: Type.Optional(Slug()),
    url: ReasonableUrl,
});

export const SchoolConfig = Type.Object({
    rspoId: RspoId,
    slug: Slug(),
    versions: Type.Record(VersionId, SchoolConfigVersionOptivum, {
        minProperties: 1,
    }),
    mainVersion: VersionId,
});
export type SchoolConfig = Static<typeof SchoolConfig>;
