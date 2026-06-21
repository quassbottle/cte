import { Elysia, t } from 'elysia';

export const bffApp = new Elysia({
	name: 'frontend-bff',
	prefix: '/bff'
}).get(
	'/health',
	() => ({
		status: 'ok' as const,
		service: 'frontend-bff' as const
	}),
	{
		response: {
			200: t.Object({
				status: t.Literal('ok'),
				service: t.Literal('frontend-bff')
			})
		}
	}
);

export type BffApp = typeof bffApp;
