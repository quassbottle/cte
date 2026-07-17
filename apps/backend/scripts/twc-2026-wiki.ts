export type TwcUser = {
  osuId: number;
  osuUsername: string;
  countryCode: string;
};

export type TwcStaffRole =
  | 'Host'
  | 'Referee'
  | 'Mapper'
  | 'Commentator'
  | 'Playtester';

export type TwcTeam = {
  name: string;
  countryCode: string;
  captainOsuId: number;
  members: TwcUser[];
};

export type TwcStaff = TwcUser & { role: TwcStaffRole };

export const toTwcUser = ({
  osuId,
  osuUsername,
  countryCode,
}: TwcUser): TwcUser => ({ osuId, osuUsername, countryCode });

export type TwcQualifier = {
  seed: number;
  teamName: string;
  rank: number;
  averageScore: number;
  osuMatchId: number;
};

export type TwcMatch = {
  id: string;
  stageName: string;
  redTeamName: string;
  blueTeamName: string;
  startsAt: string;
  osuMatchId: number | null;
  vodUrl: string | null;
};

export type TwcMappoolBeatmap = {
  stageName: string;
  osuBeatmapsetId: number;
  osuBeatmapId: number;
  label: string;
  mod: string;
  index: number;
};

const stageNames: Record<string, string> = {
  Qualifiers: 'Qualification',
  'Group stage': 'Group Stage',
  'Round of 16': 'Round of 16',
  Quarterfinals: 'Quarterfinals',
  Semifinals: 'Semifinals',
  Finals: 'Finals',
  'Grand Finals': 'Grand Finals',
};

const mods: Record<string, string> = {
  'No Mod': 'NM',
  Hidden: 'HD',
  'Hard Rock': 'HR',
  'Double Time': 'DT',
  'Free Mod': 'FM',
  Tiebreaker: 'TB',
};

const staffRoles: Record<string, TwcStaffRole | undefined> = {
  Managers: 'Host',
  'Mappool selectors': 'Mapper',
  'Mappool playtesters': 'Playtester',
  Mappers: 'Mapper',
  Commentators: 'Commentator',
  'Commentators (special guests)': 'Commentator',
  Referees: 'Referee',
};

const clean = (value: string) =>
  value
    .replace(/::\{ flag=[A-Z]{2} \}::/g, '')
    .replace(/\*\*/g, '')
    .replace(/\\([\\[\]_*<>-])/g, '$1')
    .trim();

const section = (markdown: string, start: string, end: string) =>
  markdown.split(start)[1]?.split(end)[0] ?? '';

const cells = (line: string) => line.split('|').slice(1, -1).map(clean);

const usersFrom = (value: string, fallbackCountryCode = 'XX'): TwcUser[] => {
  const users: TwcUser[] = [];
  const pattern =
    /\[((?:\\.|[^\]])+)\]\(https:\/\/osu\.ppy\.sh\/users\/(\d+)\)/g;
  for (const match of value.matchAll(pattern)) {
    const prefix = value.slice(0, match.index);
    const flags = [...prefix.matchAll(/flag=([A-Z]{2})/g)];
    users.push({
      osuId: Number(match[2]),
      osuUsername: clean(match[1]),
      countryCode: flags.at(-1)?.[1] ?? fallbackCountryCode,
    });
  }
  return users;
};

const parseDate = (value: string, offset: number) => {
  const match = value.match(/(\d{1,2}) ([A-Za-z]+) (\d{4})/);
  if (!match) throw new Error(`Invalid TWC match date: ${value}`);
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
  return new Date(
    Date.UTC(
      Number(match[3]),
      months.indexOf(match[2]),
      Number(match[1]),
      9 + offset,
    ),
  ).toISOString();
};

export function parseTwc2026Wiki(markdown: string) {
  const teams = section(markdown, '## Participants', '## Podium')
    .split('\n')
    .filter((line) => /^\| ::\{ flag=/.test(line))
    .map((line): TwcTeam => {
      const [flag, name, roster] = line
        .split('|')
        .slice(1, -1)
        .map((part) => part.trim());
      const countryCode = flag.match(/flag=([A-Z]{2})/)?.[1] ?? 'XX';
      const members = usersFrom(roster, countryCode);
      return {
        name: clean(name),
        countryCode,
        captainOsuId: members[0]?.osuId ?? 0,
        members,
      };
    })
    .filter((team) => team.captainOsuId > 0);

  const organisation = section(markdown, '## Organisation', '## Links');
  const staff: TwcStaff[] = organisation.split('\n').flatMap((line) => {
    if (!line.startsWith('|')) return [];
    const [position, members = ''] = line
      .split('|')
      .slice(1, -1)
      .map((part) => part.trim());
    const role = staffRoles[clean(position)];
    return role ? usersFrom(members).map((user) => ({ ...user, role })) : [];
  });
  const qualifiers = section(markdown, '### Qualifiers', '## Groups')
    .split('\n')
    .filter((line) => /^\| #\d+ /.test(line))
    .map((line): TwcQualifier => {
      const [seed, team, rank, averageScore, lobby] = cells(line);
      return {
        seed: Number(seed.slice(1)),
        teamName: clean(team),
        rank: Number(rank.replaceAll(',', '')),
        averageScore: Number(averageScore.replaceAll(',', '')),
        osuMatchId: Number(lobby.match(/community\/matches\/(\d+)/)?.[1]),
      };
    })
    .filter((qualifier) => qualifier.osuMatchId > 0);

  const matches: TwcMatch[] = [];
  let stageName = '';
  let date = '';
  let dateOffset = 0;
  for (const line of section(
    markdown,
    '## Match results',
    '### Qualifiers',
  ).split('\n')) {
    const heading = line.match(/^### (.+)$/)?.[1];
    if (heading) stageName = stageNames[heading] ?? '';
    if (/^[A-Za-z]+, \d{1,2} [A-Za-z]+ 2026:$/.test(line)) {
      date = line;
      dateOffset = 0;
    }
    if (!/^\| (?!ID|:-)/.test(line) || !stageName || !date) continue;
    const [id, redTeam, , , blueTeam, matchLink, vodLink] = cells(line);
    const redTeamName = clean(redTeam);
    const blueTeamName = clean(blueTeam);
    matches.push({
      id,
      stageName,
      redTeamName,
      blueTeamName,
      startsAt: parseDate(date, dateOffset++),
      osuMatchId:
        Number(matchLink.match(/community\/matches\/(\d+)/)?.[1]) || null,
      vodUrl: vodLink.match(/https:\/\/www\.twitch\.tv\/[^)]+/)?.[0] ?? null,
    });
  }

  const mappools: TwcMappoolBeatmap[] = [];
  stageName = '';
  let mod = '';
  let index = 0;
  for (const line of section(markdown, '## Mappools', '## Ruleset').split(
    '\n',
  )) {
    const heading = line.match(/^### (.+)$/)?.[1];
    if (heading) stageName = stageNames[heading] ?? '';
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

  return { teams, staff, qualifiers, matches, mappools };
}
