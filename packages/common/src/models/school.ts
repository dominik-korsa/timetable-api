import {Static, Type} from "@sinclair/typebox";
import {RspoId, Slug} from "./common.js";

export const SpecifierMinimum = Type.Union([
    Type.Literal('commune'),
    Type.Literal('county'),
    Type.Literal('voivodeship'),
]);
export type SpecifierMinimum = Static<typeof SpecifierMinimum>;

export const AreaType = Type.Union([
   Type.Literal('urban'),
   Type.Literal('rural'),
]);
export type AreaType = Static<typeof AreaType>;

export const SchoolSpecifier = Type.Object({
    schoolSlug: Slug(),
    areaType: AreaType,
    communeSlug: Slug(),
    countySlug: Slug(),
    voivodeshipSlug: Slug(),
    minimum: SpecifierMinimum,
});
export type SchoolSpecifier = Static<typeof SchoolSpecifier>;

export const School = Type.Object({
    rspoId: RspoId,
    specifier: SchoolSpecifier,
});
export type School = Static<typeof School>;
