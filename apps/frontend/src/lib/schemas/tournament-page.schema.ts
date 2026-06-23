import { z } from 'zod';

const checkbox = z.preprocess((value) => value === 'true' || value === 'on', z.boolean());
const formString = z.preprocess((value) => String(value ?? ''), z.string());
const participantIds = z
	.preprocess((value) => String(value ?? ''), z.string())
	.transform((value) =>
		Array.from(
			new Set(
				value
					.split(/[\s,]+/)
					.map((item) => item.trim())
					.filter(Boolean)
			)
		)
	);

export const tournamentRegisterFormSchema = z
	.object({
		isTeamTournament: checkbox,
		teamName: formString.transform((value) => value.trim()),
		teamParticipantIds: participantIds
	})
	.transform((value) => {
		if (!value.isTeamTournament) {
			return {};
		}

		return {
			team: {
				name: value.teamName,
				participants: value.teamParticipantIds
			}
		};
	})
	.superRefine((value, context) => {
		if (!('team' in value) || !value.team) {
			return;
		}

		const { team } = value;

		if (!team.name) {
			context.addIssue({
				code: 'custom',
				message: 'Team name is required.',
				path: ['teamName']
			});
		}

		if (team.participants.length === 0) {
			context.addIssue({
				code: 'custom',
				message: 'At least one teammate id is required.',
				path: ['teamParticipantIds']
			});
		}
	});

export type TournamentRegisterForm = z.infer<typeof tournamentRegisterFormSchema>;
