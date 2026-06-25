import type { OsuMode } from '$lib/api/types';

export const gamemodes: { value: OsuMode; label: string }[] = [
	{ value: 'osu', label: 'Standart' },
	{ value: 'taiko', label: 'Taiko' },
	{ value: 'mania', label: 'Mania' },
	{ value: 'fruits', label: 'Catch The Beat' }
] as const;
