import { parseTwc2026Wiki, toTwcUser } from './twc-2026-wiki';

const wiki = `
## Organisation
| Position | Member(s) |
| :-- | :-- |
| Managers | ::{ flag=CA }:: [Host](https://osu.ppy.sh/users/1) |
| Referees | ::{ flag=US }:: [Ref](https://osu.ppy.sh/users/2) |

## Participants
|  | Country | Members |
| :-: | :-: | :-- |
| ::{ flag=JP }:: | **Japan** | **[Captain](https://osu.ppy.sh/users/3)**, [Player](https://osu.ppy.sh/users/4) |
| ::{ flag=CL }:: | **Chile** | **[Other](https://osu.ppy.sh/users/5)**, [Mate](https://osu.ppy.sh/users/6) |

## Podium
## Match results
### Group stage
Saturday, 21 March 2026:
| ID | Team A |  |  | Team B | Match link | VOD link |
| :-: | --: | :-: | :-: | :-- | :-- | :-- |
| A1 | **Japan** ::{ flag=JP }:: | **5** | 1 | ::{ flag=CL }:: Chile | [#1](https://osu.ppy.sh/community/matches/100) | [#1](https://www.twitch.tv/videos/200) |
| SM | **Team kddk** | **5** | 4 | Team bongo | [#2](https://osu.ppy.sh/community/matches/102) | [#2](https://www.twitch.tv/videos/201) |

### Qualifiers
| Seed | Country | Rank | Avg. score | Lobby link |
| :-: | :-- | --: | --: | --: |
| #1 | ::{ flag=JP }:: Japan | 11 | 2,034,794 | [#1](https://osu.ppy.sh/community/matches/101) |

## Groups
## Mappools
### Group stage
- No Mod
  1. [Artist - Song (Mapper) \\[Oni\\]](https://osu.ppy.sh/beatmapsets/10#taiko/20)
### Qualifiers
- Hidden
  1. [Artist 2 - Song 2 (Mapper) \\[Hard\\]](https://osu.ppy.sh/beatmapsets/11#taiko/21)
## Ruleset
`;

describe('TWC 2026 wiki parser', () => {
  it('extracts the complete seed surface from official wiki markdown', () => {
    const data = parseTwc2026Wiki(wiki);

    expect(data.teams).toHaveLength(2);
    expect(data.teams[0]).toMatchObject({
      name: 'Japan',
      countryCode: 'JP',
      captainOsuId: 3,
    });
    expect(data.staff.map(({ role }) => role)).toEqual(['Host', 'Referee']);
    expect(toTwcUser(data.staff[0])).toEqual({
      osuId: 1,
      osuUsername: 'Host',
      countryCode: 'CA',
    });
    expect(data.qualifiers[0]).toMatchObject({
      seed: 1,
      teamName: 'Japan',
      osuMatchId: 101,
    });
    expect(data.matches[0]).toMatchObject({
      stageName: 'Group Stage',
      redTeamName: 'Japan',
      blueTeamName: 'Chile',
      osuMatchId: 100,
    });
    expect(data.matches[1]).toMatchObject({
      id: 'SM',
      redTeamName: 'Team kddk',
      blueTeamName: 'Team bongo',
      osuMatchId: 102,
    });
    expect(data.mappools).toEqual([
      expect.objectContaining({ stageName: 'Group Stage', mod: 'NM' }),
      expect.objectContaining({ stageName: 'Qualification', mod: 'HD' }),
    ]);
  });
});
