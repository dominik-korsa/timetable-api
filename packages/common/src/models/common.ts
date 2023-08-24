import { StringOptions, TSchema, Type } from '@sinclair/typebox';
export const Id = (options: StringOptions = {}) =>
    Type.String({
        title: 'id',
        minLength: 1,
        ...options,
    });

export const NanoId = (options: StringOptions) =>
    Type.String({
        pattern: '^[a-zA-Z0-9-_]+$',
        minLength: 16,
        maxLength: 32,
        ...options,
    });

export const RspoId = Type.Integer({
    minimum: 0,
    title: 'RSPO number',
});

export const Slug = (options: StringOptions = {}) =>
    Type.String({
        pattern: '^[a-z0-9-]+$',
        ...options,
    });

export const VersionId = Type.String({
    pattern: '^[a-z0-9-_]+$',
    minLength: 1,
    title: 'Timetable version id',
});

export const ReasonableUrl = Type.String({
    title: 'A reasonable URL',
    pattern: '^https?://',
    description:
        'The URL must begin with http:// or https://, cannot specify credentials or port number. The host cannot be an IPv4/IPv6 address or a single part hostname (TLD/local)',
});

export const Nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()]);
