export type FieldErrors = Record<string, string[] | undefined>;

export type EditAction =
	| 'updateTournament'
	| 'archiveTournament'
	| 'createStage'
	| 'updateStage'
	| 'deleteStage'
	| 'createScheduleMatch'
	| 'updateScheduleMatch'
	| 'deleteScheduleMatch'
	| 'syncScheduleMatch'
	| 'stopScheduleMatch'
	| 'createQualificationLobby'
	| 'updateQualificationLobby'
	| 'deleteQualificationLobby'
	| 'startQualificationLobby'
	| 'stopQualificationLobby'
	| 'updateQualificationSolo'
	| 'updateQualificationTeam'
	| 'updateQualificationTeamMember'
	| 'createMappool'
	| 'updateMappoolVisibility'
	| 'addMappoolBeatmap'
	| 'updateMappoolBeatmap'
	| 'replaceMappoolBeatmap'
	| 'deleteMappoolBeatmap'
	| 'assignTournamentStaff'
	| 'removeTournamentStaff';

type ActionContext = {
	stageId?: string;
	matchId?: string;
	lobbyId?: string;
	mappoolId?: string;
	beatmapId?: string;
	teamId?: string;
	userId?: string;
	roleId?: string;
};

export type TournamentEditActionResult =
	| ({
			action: EditAction;
			ok: true;
	  } & ActionContext)
	| ({
			action: EditAction;
			ok: false;
			message: string;
			errors: FieldErrors;
	  } & ActionContext);
