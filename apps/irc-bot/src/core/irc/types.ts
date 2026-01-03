export type IrcChannel = `#${string}`;
export type MpChannel = `#mp_${string}`;

export type OsuMpMode = 'osu' | 'taiko' | 'fruits' | 'mania' | 0 | 1 | 2 | 3;
export type MpSetVsMode = 'vs' | 'team-vs' | 'tag-vs' | 'tag-team-vs';
export type MpSetScoreMode = 'score' | 'accuracy' | 'combo' | 'scorev2';

export type MpTeamColor = 'red' | 'blue';
