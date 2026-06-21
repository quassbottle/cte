import { describe, expect, it } from 'bun:test';
import * as generatedApi from './generated/endpoints';

describe('generated backend API', () => {
	it('exports generated endpoint functions', () => {
		expect(Object.keys(generatedApi).length).toBeGreaterThan(0);
		expect(typeof generatedApi.tournamentControllerFindMany).toBe('function');
	});
});
