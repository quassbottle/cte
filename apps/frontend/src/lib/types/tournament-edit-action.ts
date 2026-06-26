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
	| 'createMappool'
	| 'updateMappoolVisibility'
	| 'addMappoolBeatmap'
	| 'updateMappoolBeatmap'
	| 'replaceMappoolBeatmap'
	| 'deleteMappoolBeatmap';

type ActionContext = {
	stageId?: string;
	matchId?: string;
	mappoolId?: string;
	beatmapId?: string;
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
