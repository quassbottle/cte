import { bffApp } from './app';

export const handleBffRequest = (request: Request): Promise<Response> | Response => {
	return bffApp.handle(request);
};
