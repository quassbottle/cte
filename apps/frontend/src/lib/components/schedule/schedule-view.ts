import type {
	StageScheduleDtoOutputMatchesItem,
	StageScheduleDtoOutputMatchesItemPlayersItem
} from '$lib/api/generated/model';
import type { MatchPlayerView, MatchView } from '$lib/components/match/types';

const formatDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(value));

const formatTime = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: 'UTC'
	}).format(new Date(value));

const getInitials = (name: string) =>
	name
		.split(/\s+/)
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

const toPlayerView = (
	player: StageScheduleDtoOutputMatchesItemPlayersItem | undefined
): MatchPlayerView | null => {
	if (!player) return null;

	return {
		id: player.id,
		name: player.osuUsername,
		osuId: player.osuId,
		avatarUrl: player.avatarUrl,
		country: player.countryCode,
		seed: player.seed,
		score: player.score
	};
};

export const toMatchView = (
	match: StageScheduleDtoOutputMatchesItem,
	index: number
): MatchView => ({
	id: match.id,
	number: match.matchNumber ?? index + 1,
	date: formatDate(match.startsAt),
	time: formatTime(match.startsAt),
	player1: toPlayerView(match.players[0]),
	player2: toPlayerView(match.players[1]),
	staff: match.staff.map((staff) => ({
		id: staff.id,
		name: staff.osuUsername,
		osuId: staff.osuId,
		avatarUrl: staff.avatarUrl,
		initials: getInitials(staff.osuUsername),
		role: staff.role
	})),
	mpUrl: match.mpUrl,
	vodUrl: match.vodUrl
});
