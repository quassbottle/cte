import type { OsuMode } from '$lib/api/types';

export const gamemodes: { value: OsuMode; label: string }[] = [
	{ value: 'osu', label: 'Standart' },
	{ value: 'taiko', label: 'Taiko' },
	{ value: 'fruits', label: 'Catch the beat' },
	{ value: 'mania', label: 'Mania' }
] as const;
