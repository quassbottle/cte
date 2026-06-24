import { describe, expect, it } from 'bun:test';
import openApi from '../../../../openapi/backend.json';
import * as generatedApi from './generated/endpoints';

describe('generated backend API', () => {
	it('exports generated endpoint functions', () => {
		expect(Object.keys(generatedApi).length).toBeGreaterThan(0);
		expect(typeof generatedApi.tournamentControllerFindMany).toBe('function');
	});

	it('documents typed authentication responses', () => {
		const callbackResponse =
			openApi.paths['/api/auth/auth-callback'].get.responses['200'].content['application/json']
				.schema;
		const initLoginResponse =
			openApi.paths['/api/auth/init-login'].post.responses['200'].content['application/json']
				.schema;

		expect(callbackResponse).toEqual({
			$ref: '#/components/schemas/AuthTokenDto'
		});
		expect(initLoginResponse).toEqual({
			$ref: '#/components/schemas/AuthUrlDto'
		});
	});
});
