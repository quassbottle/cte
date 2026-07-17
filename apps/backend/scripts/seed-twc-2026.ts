import { NestFactory } from '@nestjs/core';
import { eq, inArray, sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { beatmapId, BeatmapId } from '../src/lib/domain/beatmap/beatmap.id';
import { mappoolId } from '../src/lib/domain/mappool/mappool.id';
import { matchId } from '../src/lib/domain/match/match.id';
import {
  osuRoomId,
  OsuRoomId,
} from '../src/lib/domain/osu-multiplayer/osu-room.id';
import { qualificationLobbyId } from '../src/lib/domain/qualification-lobby/qualification-lobby.id';
import { StaffRoleId } from '../src/lib/domain/staff-role/staff-role.id';
import { stageId, StageId } from '../src/lib/domain/stage/stage.id';
import { teamId, TeamId } from '../src/lib/domain/team/team.id';
import { tournamentId } from '../src/lib/domain/tournament/tournament.id';
import { userId, UserId } from '../src/lib/domain/user/user.id';
import {
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  matches,
  osuMultiplayerRooms,
  qualificationLobbies,
  qualificationLobbyTeams,
  qualificationResults,
  Schema,
  staffRoles,
  stages,
  teamParticipants,
  teams,
  tournaments,
  tournamentStaffMembers,
  users,
} from '../src/lib/infrastructure/db';
import { OsuService } from '../src/lib/infrastructure/osu/osu.service';
import { parseTwc2026Wiki, TwcMappoolBeatmap } from './twc-2026-wiki';

const TOURNAMENT_NAME = 'osu!taiko World Cup 2026';
const WIKI_URL =
  'https://raw.githubusercontent.com/ppy/osu-wiki/master/wiki/Tournaments/TWC/2026/en.md';

const stageDates = [
  ['Qualification', '2026-03-14T00:00:00Z', '2026-03-15T23:59:59Z'],
  ['Group Stage', '2026-03-21T00:00:00Z', '2026-03-22T23:59:59Z'],
  ['Round of 16', '2026-03-28T00:00:00Z', '2026-03-29T23:59:59Z'],
  ['Quarterfinals', '2026-04-04T00:00:00Z', '2026-04-05T23:59:59Z'],
  ['Semifinals', '2026-04-11T00:00:00Z', '2026-04-12T23:59:59Z'],
  ['Finals', '2026-04-18T00:00:00Z', '2026-04-19T23:59:59Z'],
  ['Grand Finals', '2026-04-25T00:00:00Z', '2026-04-26T23:59:59Z'],
] as const;

const beatmapMetadata = (map: TwcMappoolBeatmap) => {
  const difficultyName = map.label.match(/\[([^\]]+)\]$/)?.[1] ?? 'TWC 2026';
  const withoutDifficulty = map.label.replace(/\s*\[[^\]]+\]$/, '');
  const separator = withoutDifficulty.indexOf(' - ');
  return {
    artist: separator < 0 ? 'TWC 2026' : withoutDifficulty.slice(0, separator),
    title: (separator < 0
      ? withoutDifficulty
      : withoutDifficulty.slice(separator + 3)
    ).replace(/\s+\([^()]+\)$/, ''),
    difficultyName,
    difficulty: 0,
    version: 0,
  };
};

const main = async () => {
  const response = await fetch(WIKI_URL);
  if (!response.ok)
    throw new Error(`Could not load TWC 2026 wiki: ${response.status}`);
  const data = parseTwc2026Wiki(await response.text());
  if (
    data.teams.length < 40 ||
    data.qualifiers.length < 40 ||
    data.matches.length < 60 ||
    data.mappools.length < 90
  ) {
    throw new Error(
      'TWC 2026 wiki format changed; refusing to create a partial seed',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const db = app.get<Schema>('DB');
    const osuService = app.get(OsuService);
    const uniqueMaps = new Map(
      data.mappools.map((map) => [map.osuBeatmapId, map]),
    );
    const mapMetadata = new Map(
      [...uniqueMaps].map(([id, map]) => [id, beatmapMetadata(map)]),
    );
    for (const [id] of uniqueMaps) {
      try {
        const map = await osuService.getBeatmapDetails({ osuBeatmapId: id });
        mapMetadata.set(id, {
          artist: map.beatmapset.artist,
          title: map.beatmapset.title,
          difficultyName: map.version,
          difficulty: Math.round(map.difficulty_rating * 100) / 100,
          version: map.ranked,
        });
      } catch (error) {
        console.warn(
          `[seed:twc-2026] using wiki metadata for beatmap ${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    await db.transaction(async (tx) => {
      const allUsers = new Map<
        number,
        { osuId: number; osuUsername: string; countryCode: string }
      >();
      for (const team of data.teams) {
        for (const member of team.members) allUsers.set(member.osuId, member);
      }
      for (const member of data.staff) {
        if (!allUsers.has(member.osuId)) allUsers.set(member.osuId, member);
      }

      await tx
        .insert(users)
        .values(
          [...allUsers.values()].map((user) => ({
            id: userId(),
            ...user,
            defaultMode: 'taiko' as const,
          })),
        )
        .onConflictDoUpdate({
          target: users.osuId,
          set: { defaultMode: 'taiko' },
        });
      const userRows = await tx
        .select({ id: users.id, osuId: users.osuId })
        .from(users)
        .where(inArray(users.osuId, [...allUsers.keys()]));
      const usersByOsuId = new Map(
        userRows.map((user) => [user.osuId, user.id]),
      );
      const host = data.staff.find(({ role }) => role === 'Host');
      const hostId = host ? usersByOsuId.get(host.osuId) : undefined;
      if (!hostId) throw new Error('TWC 2026 host not found');

      await tx.delete(tournaments).where(eq(tournaments.name, TOURNAMENT_NAME));
      const osuMatchIds = [
        ...new Set([
          ...data.qualifiers.map(({ osuMatchId }) => osuMatchId),
          ...data.matches.flatMap(({ osuMatchId }) =>
            osuMatchId ? [osuMatchId] : [],
          ),
        ]),
      ];
      const existingRooms = await tx
        .select({
          id: osuMultiplayerRooms.id,
          osuMatchId: osuMultiplayerRooms.osuMatchId,
          snapshotHash: osuMultiplayerRooms.snapshotHash,
        })
        .from(osuMultiplayerRooms)
        .where(inArray(osuMultiplayerRooms.osuMatchId, osuMatchIds));
      const roomIds = new Map<number, OsuRoomId>(
        existingRooms.map((room) => [room.osuMatchId, room.id]),
      );
      const missingRooms = osuMatchIds.filter(
        (osuMatchId) => !roomIds.has(osuMatchId),
      );
      for (const osuMatchId of missingRooms)
        roomIds.set(osuMatchId, osuRoomId());
      const unsyncedRooms = existingRooms
        .filter(({ snapshotHash }) => !snapshotHash)
        .map(({ id }) => id);
      if (unsyncedRooms.length) {
        await tx
          .update(osuMultiplayerRooms)
          .set({ status: 'active', nextSyncAt: new Date() })
          .where(inArray(osuMultiplayerRooms.id, unsyncedRooms));
      }
      if (missingRooms.length) {
        await tx.insert(osuMultiplayerRooms).values(
          missingRooms.map((osuMatchId) => ({
            id: roomIds.get(osuMatchId)!,
            osuMatchId,
          })),
        );
      }

      const tournament = tournamentId();
      await tx.insert(tournaments).values({
        id: tournament,
        name: TOURNAMENT_NAME,
        mode: 'taiko',
        isTeam: true,
        registrationOpen: false,
        creatorId: hostId,
        startsAt: new Date('2026-02-13T20:00:00Z'),
        endsAt: new Date('2026-04-26T23:59:59Z'),
      });

      const stageIds = new Map<string, StageId>();
      for (const [name] of stageDates) stageIds.set(name, stageId());
      await tx.insert(stages).values(
        stageDates.map(([name, startsAt, endsAt]) => ({
          id: stageIds.get(name)!,
          name,
          type:
            name === 'Qualification'
              ? ('qualification' as const)
              : ('regular' as const),
          tournamentId: tournament,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        })),
      );

      const teamIds = new Map<string, TeamId>();
      for (const team of data.teams) teamIds.set(team.name, teamId());
      await tx.insert(teams).values(
        data.teams.map((team) => ({
          id: teamIds.get(team.name)!,
          name: team.name,
          captainId: usersByOsuId.get(team.captainOsuId)!,
          tournamentId: tournament,
        })),
      );
      await tx.insert(teamParticipants).values(
        data.teams.flatMap((team) =>
          team.members.map((member) => ({
            teamId: teamIds.get(team.name)!,
            userId: usersByOsuId.get(member.osuId)!,
          })),
        ),
      );

      const roleRows = await tx
        .select({ id: staffRoles.id, name: staffRoles.name })
        .from(staffRoles);
      const roleIds = new Map(roleRows.map((role) => [role.name, role.id]));
      const staff = new Map<string, { roleId: StaffRoleId; userId: UserId }>();
      for (const member of data.staff) {
        const roleId = roleIds.get(member.role);
        const memberId = usersByOsuId.get(member.osuId);
        if (roleId && memberId)
          staff.set(`${roleId}:${memberId}`, { roleId, userId: memberId });
      }
      await tx.insert(tournamentStaffMembers).values(
        [...staff.values()].map((member) => ({
          tournamentId: tournament,
          ...member,
        })),
      );

      await tx
        .insert(beatmaps)
        .values(
          [...uniqueMaps.values()].map((map) => ({
            id: beatmapId(),
            osuBeatmapsetId: map.osuBeatmapsetId,
            osuBeatmapId: map.osuBeatmapId,
            ...mapMetadata.get(map.osuBeatmapId)!,
            mode: 'taiko' as const,
            deleted: false,
          })),
        )
        .onConflictDoUpdate({
          target: beatmaps.osuBeatmapId,
          set: {
            osuBeatmapsetId: sql`excluded.osu_beatmapset_id`,
            artist: sql`excluded.artist`,
            title: sql`excluded.title`,
            mode: sql`excluded.mode`,
            difficultyName: sql`excluded.difficulty_name`,
            difficulty: sql`excluded.difficulty`,
            version: sql`excluded.version`,
            deleted: false,
          },
        });
      const beatmapRows = await tx
        .select({ id: beatmaps.id, osuBeatmapId: beatmaps.osuBeatmapId })
        .from(beatmaps)
        .where(inArray(beatmaps.osuBeatmapId, [...uniqueMaps.keys()]));
      const beatmapIds = new Map<number, BeatmapId>(
        beatmapRows.map((map) => [map.osuBeatmapId, map.id]),
      );
      const poolIds = new Map<string, ReturnType<typeof mappoolId>>();
      for (const [name] of stageDates) poolIds.set(name, mappoolId());
      await tx.insert(mappools).values(
        stageDates.map(([name, startsAt, endsAt]) => ({
          id: poolIds.get(name)!,
          stageId: stageIds.get(name)!,
          startsAt: new Date(
            new Date(startsAt).valueOf() - 7 * 24 * 60 * 60 * 1000,
          ),
          endsAt: new Date(endsAt),
          hidden: false,
        })),
      );
      await tx.insert(mappoolsBeatmaps).values(
        data.mappools.map((map) => ({
          mappoolId: poolIds.get(map.stageName)!,
          beatmapId: beatmapIds.get(map.osuBeatmapId)!,
          mod: map.mod,
          index: map.index,
        })),
      );

      const qualificationStageId = stageIds.get('Qualification')!;
      const referees = data.staff
        .filter(({ role }) => role === 'Referee')
        .map(({ osuId }) => usersByOsuId.get(osuId))
        .filter((id): id is UserId => Boolean(id));
      const lobbyIds = new Map<
        number,
        ReturnType<typeof qualificationLobbyId>
      >();
      for (const qualifier of data.qualifiers) {
        lobbyIds.set(qualifier.seed, qualificationLobbyId());
      }
      await tx.insert(qualificationLobbies).values(
        data.qualifiers.map((qualifier, index) => {
          const startsAt = new Date(
            Date.UTC(2026, 2, 14 + Math.floor(index / 22), index % 22),
          );
          return {
            id: lobbyIds.get(qualifier.seed)!,
            stageId: qualificationStageId,
            number: qualifier.seed,
            refereeId: referees[index % referees.length] ?? hostId,
            startsAt,
            endsAt: new Date(startsAt.valueOf() + 2 * 60 * 60 * 1000),
            mpUrl: `https://osu.ppy.sh/community/matches/${qualifier.osuMatchId}`,
            osuRoomId: roomIds.get(qualifier.osuMatchId)!,
          };
        }),
      );
      await tx.insert(qualificationLobbyTeams).values(
        data.qualifiers.map((qualifier) => ({
          lobbyId: lobbyIds.get(qualifier.seed)!,
          stageId: qualificationStageId,
          teamId: teamIds.get(qualifier.teamName)!,
        })),
      );
      await tx.insert(qualificationResults).values(
        data.qualifiers.map((qualifier) => ({
          stageId: qualificationStageId,
          teamId: teamIds.get(qualifier.teamName)!,
          seed: qualifier.seed,
          aggregateScore: qualifier.averageScore,
        })),
      );

      const matchNumber = new Map<string, number>();
      const seededMatches = data.matches.map((match) => {
        const number = (matchNumber.get(match.stageName) ?? 0) + 1;
        matchNumber.set(match.stageName, number);
        return {
          id: matchId(),
          name: `${match.id}: ${match.redTeamName} vs ${match.blueTeamName}`,
          stageId: stageIds.get(match.stageName)!,
          matchNumber: number,
          creatorId: hostId,
          startsAt: new Date(match.startsAt),
          endsAt: new Date(
            new Date(match.startsAt).valueOf() + 3 * 60 * 60 * 1000,
          ),
          osuRoomId: match.osuMatchId ? roomIds.get(match.osuMatchId)! : null,
          vodUrl: match.vodUrl,
          redTeamId: teamIds.get(match.redTeamName) ?? null,
          blueTeamId: teamIds.get(match.blueTeamName) ?? null,
        };
      });
      await tx.insert(matches).values(seededMatches);

      console.log(
        `Seeded ${TOURNAMENT_NAME}: ${data.teams.length} teams, ${data.qualifiers.length} qualifier lobbies, ${data.matches.length} matches, ${data.mappools.length} beatmaps`,
      );
    });
  } finally {
    await app.close();
  }
};

void main();
