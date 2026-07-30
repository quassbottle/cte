import {
  assertCompleteEgts2022,
  parseEgts2022Wiki,
  toEgtsUser,
} from './egts-2022-wiki';

const wiki = `
## Organisation
| Position | Member(s) |
| :-- | :-- |
| Organiser | ::{ flag=FR }:: [Host](https://osu.ppy.sh/users/10) |
| Head mappooler | ::{ flag=GB }:: [Head](https://osu.ppy.sh/users/11) |
| Mappool playtester | ::{ flag=US }:: [Tester](https://osu.ppy.sh/users/12) |
| Referee | ::{ flag=DE }:: [Ref](https://osu.ppy.sh/users/13) |
| Streamer | ::{ flag=NL }:: [Caster](https://osu.ppy.sh/users/14) |
| Commentator | ::{ flag=AU }:: [Commentator](https://osu.ppy.sh/users/15) |

## Links
## Participants
| Seed | Members |
| :-- | :-- |
| Top | ::{ flag=JP }:: [Player\\_one](https://osu.ppy.sh/users/1) |
| High | ::{ flag=CA }:: [Other](https://osu.ppy.sh/users/2) |

## Podium
## Mappools
### Round of 96
- NoMod
  1. [Artist - Song (Mapper) \\[Oni\\]](https://osu.ppy.sh/beatmapsets/10#taiko/20)
### Qualifiers
- ForceMod
  1. [Artist 2 - Song 2 (Mapper) \\[Hard\\]](https://osu.ppy.sh/beatmapsets/11#taiko/21)

## Match results
### Round of 96
Saturday, 20 August 2022:
| Player 1 |  |  | Player 2 | Match link |
| --: | :-: | :-: | :-- | :-- |
| **Player\\_one** ::{ flag=JP }:: | **5** | 1 | ::{ flag=CA }:: Other | [#1](https://osu.ppy.sh/community/matches/100) |
| **Other** ::{ flag=CA }:: | **0** | -1 | ::{ flag=GB }:: Dusk | *win by default* |

## Ruleset
`;

describe('EGTS 2022 wiki parser', () => {
  it('extracts the complete seed surface from official wiki markdown', () => {
    const data = parseEgts2022Wiki(wiki);

    expect(data.participants).toEqual([
      {
        seedGroup: 'Top',
        osuId: 1,
        osuUsername: 'Player_one',
        countryCode: 'JP',
      },
      {
        seedGroup: 'High',
        osuId: 2,
        osuUsername: 'Other',
        countryCode: 'CA',
      },
    ]);
    expect(data.staff.map(({ role }) => role)).toEqual([
      'Host',
      'Mapper',
      'Playtester',
      'Referee',
      'Streamer',
      'Commentator',
    ]);
    expect(toEgtsUser(data.staff[0])).toEqual({
      osuId: 10,
      osuUsername: 'Host',
      countryCode: 'FR',
    });
    expect(data.matches).toEqual([
      expect.objectContaining({
        stageName: 'Round of 96',
        player1Name: 'Player_one',
        player2Name: 'Other',
        osuMatchId: 100,
        isWalkover: false,
      }),
      expect.objectContaining({
        player1Name: 'Other',
        player2Name: 'Dusk-',
        osuMatchId: null,
        isWalkover: true,
      }),
    ]);
    expect(data.matches.map(({ startsAt }) => startsAt)).toEqual([
      '2022-08-20T09:00:00.000Z',
      '2022-08-20T09:10:00.000Z',
    ]);
    expect(data.mappools).toEqual([
      expect.objectContaining({
        stageName: 'Round of 96',
        osuBeatmapId: 20,
        mod: 'NM',
        index: 1,
      }),
      expect.objectContaining({
        stageName: 'Qualifiers',
        osuBeatmapId: 21,
        mod: 'FM',
        index: 1,
      }),
    ]);
  });

  it('rejects a partial wiki parse', () => {
    expect(() =>
      assertCompleteEgts2022({
        participants: [],
        staff: [],
        matches: [],
        mappools: [],
      }),
    ).toThrow('EGTS 2022 wiki format changed');
  });

  it('rejects missing multiplayer rooms and stages', () => {
    const parsed = parseEgts2022Wiki(wiki);
    const participants = Array(100).fill(parsed.participants[0]);
    const staff = Array(30).fill(parsed.staff[0]);
    const matchStages = [
      'Round of 96',
      'Round of 64',
      'Round of 32',
      'Round of 16',
      'Quarterfinals',
      'Semifinals',
      'Finals',
      'Grand Finals',
    ];
    const mappoolStages = ['Qualifiers', ...matchStages];
    const matches = Array.from({ length: 150 }, (_, index) => ({
      ...parsed.matches[0],
      stageName: matchStages[index % matchStages.length],
      osuMatchId: index + 1,
    }));
    const mappools = Array.from({ length: 100 }, (_, index) => ({
      ...parsed.mappools[0],
      stageName: mappoolStages[index % mappoolStages.length],
    }));

    expect(() =>
      assertCompleteEgts2022({
        participants,
        staff,
        matches: matches.map((match) => ({ ...match, osuMatchId: null })),
        mappools,
      }),
    ).toThrow('EGTS 2022 wiki format changed');
    expect(() =>
      assertCompleteEgts2022({
        participants,
        staff,
        matches: matches.map((match) =>
          match.stageName === 'Grand Finals'
            ? { ...match, stageName: 'Finals' }
            : match,
        ),
        mappools,
      }),
    ).toThrow('EGTS 2022 wiki format changed');
  });

  it('rejects an unknown match month', () => {
    expect(() =>
      parseEgts2022Wiki(`
## Match results
### Round of 96
Saturday, 20 Never 2022:
| Player 1 |  |  | Player 2 | Match link |
| --: | :-: | :-: | :-- | :-- |
| Foo | 5 | 1 | Bar | *win by default* |
## Ruleset
`),
    ).toThrow('Invalid EGTS match month');
  });

  it('drops the incorrect duplicate room link from Pochacco vs 6_6', () => {
    const data = parseEgts2022Wiki(`
## Match results
### Round of 32
Sunday, 3 September 2022:
| Player 1 |  |  | Player 2 | Match link |
| --: | :-: | :-: | :-- | :-- |
| **Pochacco** ::{ flag=PH }:: | **6** | 2 | ::{ flag=CA }:: 6\\_6 | [#1](https://osu.ppy.sh/community/matches/103554627) |
| **Megafan** ::{ flag=AR }:: | **6** | 3 | ::{ flag=CA }:: Shing\\_ | [#1](https://osu.ppy.sh/community/matches/103554627) |
## Ruleset
`);

    expect(data.matches.map(({ osuMatchId }) => osuMatchId)).toEqual([
      null,
      103554627,
    ]);
    expect(data.matches[0].startsAt).toBe('2022-09-04T09:00:00.000Z');
  });
});
