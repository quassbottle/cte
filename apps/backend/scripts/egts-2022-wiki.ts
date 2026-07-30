export type EgtsUser = {
  osuId: number;
  osuUsername: string;
  countryCode: string;
};

export type EgtsStaffRole =
  | 'Host'
  | 'Mapper'
  | 'Playtester'
  | 'Referee'
  | 'Streamer'
  | 'Commentator';

export type EgtsParticipant = EgtsUser & { seedGroup: string };
export type EgtsStaff = EgtsUser & { role: EgtsStaffRole };

export type EgtsMatch = {
  stageName: string;
  player1Name: string;
  player2Name: string;
  startsAt: string;
  osuMatchId: number | null;
  isWalkover: boolean;
  index: number;
};

export type EgtsMappoolBeatmap = {
  stageName: string;
  osuBeatmapsetId: number;
  osuBeatmapId: number;
  label: string;
  mod: string;
  index: number;
};

export type Egts2022Wiki = {
  participants: EgtsParticipant[];
  staff: EgtsStaff[];
  matches: EgtsMatch[];
  mappools: EgtsMappoolBeatmap[];
};

export const toEgtsUser = ({
  osuId,
  osuUsername,
  countryCode,
}: EgtsUser): EgtsUser => ({ osuId, osuUsername, countryCode });

const stageNames = new Set([
  'Qualifiers',
  'Round of 96',
  'Round of 64',
  'Round of 32',
  'Round of 16',
  'Quarterfinals',
  'Semifinals',
  'Finals',
  'Grand Finals',
]);

const matchStageNames = new Set(
  [...stageNames].filter((stageName) => stageName !== 'Qualifiers'),
);

const mods: Record<string, string> = {
  NoMod: 'NM',
  Hidden: 'HD',
  HardRock: 'HR',
  DoubleTime: 'DT',
  ForceMod: 'FM',
  Tiebreaker: 'TB',
};

const staffRoles: Record<string, EgtsStaffRole | undefined> = {
  Organiser: 'Host',
  'Head mappooler': 'Mapper',
  Mapper: 'Mapper',
  'Mappool playtester': 'Playtester',
  Referee: 'Referee',
  Streamer: 'Streamer',
  Commentator: 'Commentator',
};

const aliases: Record<string, string> = { Dusk: 'Dusk-' };

const clean = (value: string) =>
  value
    .replace(/::\{ flag=[A-Z]{2} \}::/g, '')
    .replace(/\*\*/g, '')
    .replace(/\\([\\[\]_*<>~-])/g, '$1')
    .trim();

const section = (markdown: string, start: string, end: string) =>
  markdown.split(start)[1]?.split(end)[0] ?? '';

const cells = (line: string) => line.split('|').slice(1, -1).map(clean);

const usersFrom = (value: string): EgtsUser[] => {
  const users: EgtsUser[] = [];
  const pattern =
    /\[((?:\\.|[^\]])+)\]\(https:\/\/osu\.ppy\.sh\/users\/(\d+)\)/g;
  for (const match of value.matchAll(pattern)) {
    const flags = [...value.slice(0, match.index).matchAll(/flag=([A-Z]{2})/g)];
    users.push({
      osuId: Number(match[2]),
      osuUsername: clean(match[1]),
      countryCode: flags.at(-1)?.[1] ?? 'XX',
    });
  }
  return users;
};

const parseDate = (value: string, offset: number) => {
  const match = value.match(/(\d{1,2}) ([A-Za-z]+) (\d{4})/);
  if (!match) throw new Error(`Invalid EGTS match date: ${value}`);
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const month = months.indexOf(match[2]);
  if (month < 0) throw new Error(`Invalid EGTS match month: ${match[2]}`);
  const day =
    Number(match[1]) + (value === 'Sunday, 3 September 2022:' ? 1 : 0);
  return new Date(
    Date.UTC(Number(match[3]), month, day, 9, offset * 10),
  ).toISOString();
};

export function parseEgts2022Wiki(markdown: string): Egts2022Wiki {
  const participants = section(markdown, '## Participants', '## Podium')
    .split('\n')
    .filter((line) => /^\| (Top|High|Low|Unseeded|Eliminated) /.test(line))
    .flatMap((line): EgtsParticipant[] => {
      const [seedGroup, members = ''] = line
        .split('|')
        .slice(1, -1)
        .map((part) => part.trim());
      return usersFrom(members).map((user) => ({
        ...user,
        seedGroup: clean(seedGroup),
      }));
    });

  const organisation = section(markdown, '## Organisation', '## Links');
  const staff = organisation.split('\n').flatMap((line): EgtsStaff[] => {
    if (!line.startsWith('|')) return [];
    const [position, members = ''] = line
      .split('|')
      .slice(1, -1)
      .map((part) => part.trim());
    const role = staffRoles[clean(position)];
    return role ? usersFrom(members).map((user) => ({ ...user, role })) : [];
  });

  const mappools: EgtsMappoolBeatmap[] = [];
  let stageName = '';
  let mod = '';
  let index = 0;
  for (const line of section(markdown, '## Mappools', '## Match results').split(
    '\n',
  )) {
    const heading = line.match(/^### (.+)$/)?.[1] ?? '';
    if (stageNames.has(heading)) stageName = heading;
    const bracket = line.match(/^- (.+)$/)?.[1];
    if (bracket) {
      mod = mods[bracket] ?? '';
      index = 0;
    }
    const beatmap = line.match(
      /^\s+\d+\.\s+\**\[(.*)\]\(https:\/\/osu\.ppy\.sh\/beatmapsets\/(\d+)#taiko\/(\d+)\)/,
    );
    if (!beatmap || !stageName || !mod) continue;
    mappools.push({
      stageName,
      label: clean(beatmap[1]),
      osuBeatmapsetId: Number(beatmap[2]),
      osuBeatmapId: Number(beatmap[3]),
      mod,
      index: ++index,
    });
  }

  const matches: EgtsMatch[] = [];
  stageName = '';
  let date = '';
  let dateOffset = 0;
  const stageIndexes = new Map<string, number>();
  for (const line of section(markdown, '## Match results', '## Ruleset').split(
    '\n',
  )) {
    const heading = line.match(/^### (.+)$/)?.[1] ?? '';
    if (stageNames.has(heading)) stageName = heading;
    if (/^[A-Za-z]+, \d{1,2} [A-Za-z]+ 2022:$/.test(line)) {
      date = line;
      dateOffset = 0;
    }
    if (!/^\| (?!Player|--)/.test(line) || !stageName || !date) continue;
    const [player1, , , player2, matchLink] = cells(line);
    const player1Name = aliases[player1] ?? player1;
    const player2Name = aliases[player2] ?? player2;
    const matchIndex = (stageIndexes.get(stageName) ?? 0) + 1;
    const osuMatchId =
      Number(matchLink.match(/community\/matches\/(\d+)/)?.[1]) || null;
    stageIndexes.set(stageName, matchIndex);
    matches.push({
      stageName,
      player1Name,
      player2Name,
      startsAt: parseDate(date, dateOffset++),
      osuMatchId:
        osuMatchId === 103554627 &&
        player1Name === 'Pochacco' &&
        player2Name === '6_6'
          ? null
          : osuMatchId,
      isWalkover: /win by default/.test(matchLink),
      index: matchIndex,
    });
  }

  return { participants, staff, matches, mappools };
}

export const assertCompleteEgts2022 = (data: Egts2022Wiki) => {
  const rooms = new Set(
    data.matches.flatMap(({ osuMatchId }) => (osuMatchId ? [osuMatchId] : [])),
  );
  const matchesHaveEveryStage =
    new Set(data.matches.map(({ stageName }) => stageName)).size ===
      matchStageNames.size &&
    [...matchStageNames].every((stageName) =>
      data.matches.some((match) => match.stageName === stageName),
    );
  const mappoolsHaveEveryStage =
    new Set(data.mappools.map(({ stageName }) => stageName)).size ===
      stageNames.size &&
    [...stageNames].every((stageName) =>
      data.mappools.some((map) => map.stageName === stageName),
    );
  if (
    data.participants.length < 100 ||
    data.staff.length < 30 ||
    data.matches.length < 150 ||
    data.mappools.length < 100 ||
    rooms.size < 150 ||
    !matchesHaveEveryStage ||
    !mappoolsHaveEveryStage
  )
    throw new Error(
      'EGTS 2022 wiki format changed; refusing to create a partial seed',
    );
};
