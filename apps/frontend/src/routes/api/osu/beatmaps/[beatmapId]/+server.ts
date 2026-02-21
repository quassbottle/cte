import { json } from '@sveltejs/kit';

// Deprecated: frontend should call backend API directly via PUBLIC_API_URL.
export async function GET() {
  return json({ message: 'Deprecated route' }, { status: 410 });
}
