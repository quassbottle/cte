import { describe, expect, it } from 'bun:test';
import { normalizeOpenApiDocument } from './normalize';

describe('normalizeOpenApiDocument', () => {
	it('converts OpenAPI 3.1 numeric exclusive bounds to OpenAPI 3.0 bounds', () => {
		const document = {
			openapi: '3.0.0',
			components: {
				schemas: {
					Identifier: {
						type: 'integer',
						exclusiveMinimum: 0
					}
				}
			}
		};

		expect(normalizeOpenApiDocument(document)).toEqual({
			openapi: '3.0.0',
			components: {
				schemas: {
					Identifier: {
						type: 'integer',
						minimum: 0,
						exclusiveMinimum: true
					}
				}
			}
		});
	});
});
