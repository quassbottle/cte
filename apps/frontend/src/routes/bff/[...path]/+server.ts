import { handleBffRequest } from '$lib/server/bff/http-handler';
import type { RequestHandler } from './$types';

const handle: RequestHandler = ({ request }) => handleBffRequest(request);

export {
	handle as DELETE,
	handle as GET,
	handle as OPTIONS,
	handle as PATCH,
	handle as POST,
	handle as PUT
};
