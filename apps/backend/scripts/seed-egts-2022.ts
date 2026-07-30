import { NestFactory } from '@nestjs/core';
import { and, eq, inArray, notExists, sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { beatmapId, BeatmapId } from '../src/lib/domain/beatmap/beatmap.id';
import { mappoolId } from '../src/lib/domain/mappool/mappool.id';
import { matchId } from '../src/lib/domain/match/match.id';
import {
  osuRoomId,
  OsuRoomId,
} from '../src/lib/domain/osu-multiplayer/osu-room.id';
import { StaffRoleId } from '../src/lib/domain/staff-role/staff-role.id';
import { stageId, StageId } from '../src/lib/domain/stage/stage.id';
import { tournamentId } from '../src/lib/domain/tournament/tournament.id';
import { userId, UserId } from '../src/lib/domain/user/user.id';
import {
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  matches,
  matchParticipants,
  osuMultiplayerRooms,
  osuStats,
  qualificationLobbies,
  Schema,
  soloParticipants,
  staffRoles,
  stages,
  tournaments,
  tournamentStaffMembers,
  users,
} from '../src/lib/infrastructure/db';
import {
  OsuApiMode,
  OsuService,
} from '../src/lib/infrastructure/osu/osu.service';
import { OsuUserDetails } from '../src/lib/infrastructure/osu/osu.types';
import { OsuMultiplayerSyncService } from '../src/modules/osu-multiplayer-sync/osu-multiplayer-sync.service';
import {
  assertCompleteEgts2022,
  EgtsMappoolBeatmap,
  parseEgts2022Wiki,
  toEgtsUser,
} from './egts-2022-wiki';

const TOURNAMENT_NAME = 'Expert Global Taiko Showdown 2022';
const WIKI_URL =
  'https://raw.githubusercontent.com/ppy/osu-wiki/master/wiki/Tournaments/GTS/EGTS_2022/en.md';

const stageDates = [
  ['Qualifiers', '2022-08-11T00:00:00Z', '2022-08-14T23:59:59Z'],
  ['Round of 96', '2022-08-19T00:00:00Z', '2022-08-21T23:59:59Z'],
  ['Round of 64', '2022-08-27T00:00:00Z', '2022-08-28T23:59:59Z'],
  ['Round of 32', '2022-09-02T00:00:00Z', '2022-09-04T23:59:59Z'],
  ['Round of 16', '2022-09-10T00:00:00Z', '2022-09-11T23:59:59Z'],
  ['Quarterfinals', '2022-09-17T00:00:00Z', '2022-09-18T23:59:59Z'],
  ['Semifinals', '2022-09-24T00:00:00Z', '2022-09-25T23:59:59Z'],
  ['Finals', '2022-10-01T00:00:00Z', '2022-10-02T23:59:59Z'],
  ['Grand Finals', '2022-10-08T00:00:00Z', '2022-10-09T23:59:59Z'],
] as const;

const beatmapMetadata = (map: EgtsMappoolBeatmap) => {
  const difficultyName = map.label.match(/\[([^\]]+)\]$/)?.[1] ?? 'EGTS 2022';
  const withoutDifficulty = map.label.replace(/\s*\[[^\]]+\]$/, '');
  const separator = withoutDifficulty.indexOf(' - ');
  return {
    artist: separator < 0 ? 'EGTS 2022' : withoutDifficulty.slice(0, separator),
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
    throw new Error(`Could not load EGTS 2022 wiki: ${response.status}`);
  const data = parseEgts2022Wiki(await response.text());
  assertCompleteEgts2022(data);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const db = app.get<Schema>('DB');
    const osuService = app.get(OsuService);
    const syncService = app.get(OsuMultiplayerSyncService);
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
          `[seed:egts-2022] using wiki metadata for beatmap ${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const allUsers = new Map(
      data.participants.map((participant) => [
        participant.osuId,
        toEgtsUser(participant),
      ]),
    );
    for (const member of data.staff) {
      if (!allUsers.has(member.osuId))
        allUsers.set(member.osuId, toEgtsUser(member));
    }
    const participantStats: OsuUserDetails[] = [];
    for (const participant of data.participants) {
      try {
        const user = await osuService.getUserDetails({
          osuUserId: participant.osuId,
          mode: OsuApiMode.Taiko,
        });
        participantStats.push(user);
      } catch (error) {
        console.warn(
          `[seed:egts-2022] could not load taiko stats for ${participant.osuId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const seededRoomIds = await db.transaction(async (tx) => {
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
          set: {
            defaultMode: 'taiko',
            role: sql`case when ${users.role} in ('default', 'admin') then ${users.role} else 'default' end`,
          },
        });
      const userRows = await tx
        .select({ id: users.id, osuId: users.osuId })
        .from(users)
        .where(inArray(users.osuId, [...allUsers.keys()]));
      const usersByOsuId = new Map(
        userRows.map((user) => [user.osuId, user.id]),
      );
      if (participantStats.length) {
        await tx
          .insert(osuStats)
          .values(
            participantStats.map((stats) => ({
              userId: usersByOsuId.get(stats.id)!,
              osuId: stats.id,
              mode: 'taiko' as const,
              performancePoints: stats.performancePoints,
              rank: stats.globalRank,
            })),
          )
          .onConflictDoUpdate({
            target: [osuStats.userId, osuStats.mode],
            set: {
              performancePoints: sql`excluded.performance_points`,
              rank: sql`excluded.rank`,
              updatedAt: sql`now()`,
            },
          });
      }
      const participantIdsByName = new Map(
        data.participants.map((participant) => [
          participant.osuUsername,
          usersByOsuId.get(participant.osuId)!,
        ]),
      );
      const host = data.staff.find(({ role }) => role === 'Host');
      const hostId = host ? usersByOsuId.get(host.osuId) : undefined;
      if (!hostId) throw new Error('EGTS 2022 host not found');

      await tx.delete(tournaments).where(eq(tournaments.name, TOURNAMENT_NAME));
      const osuMatchIds = [
        ...new Set(
          data.matches.flatMap(({ osuMatchId }) =>
            osuMatchId ? [osuMatchId] : [],
          ),
        ),
      ];
      const existingRooms = await tx
        .select({
          id: osuMultiplayerRooms.id,
          osuMatchId: osuMultiplayerRooms.osuMatchId,
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
        isTeam: false,
        registrationOpen: false,
        creatorId: hostId,
        startsAt: new Date('2022-07-16T00:00:00Z'),
        endsAt: new Date('2022-10-09T23:59:59Z'),
      });

      const stageIds = new Map<string, StageId>();
      for (const [name] of stageDates) stageIds.set(name, stageId());
      await tx.insert(stages).values(
        stageDates.map(([name, startsAt, endsAt]) => ({
          id: stageIds.get(name)!,
          name,
          type:
            name === 'Qualifiers'
              ? ('qualification' as const)
              : ('regular' as const),
          tournamentId: tournament,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        })),
      );

      await tx.insert(soloParticipants).values(
        data.participants.map((participant) => ({
          tournamentId: tournament,
          userId: usersByOsuId.get(participant.osuId)!,
          withdrawn: participant.seedGroup === 'Eliminated',
          withdrawalReason:
            participant.seedGroup === 'Eliminated'
              ? 'Eliminated during screening'
              : null,
        })),
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

      const seededMatches = data.matches.map((match) => ({
        source: match,
        row: {
          id: matchId(),
          name: `${match.player1Name || 'Unknown'} vs ${match.player2Name || 'Unknown'}`,
          stageId: stageIds.get(match.stageName)!,
          matchNumber: `${match.stageName}-${match.index}`,
          creatorId: hostId,
          startsAt: new Date(match.startsAt),
          endsAt: new Date(
            new Date(match.startsAt).valueOf() + 3 * 60 * 60 * 1000,
          ),
          osuRoomId: match.osuMatchId ? roomIds.get(match.osuMatchId)! : null,
          vodUrl: null,
          redTeamId: null,
          blueTeamId: null,
        },
      }));
      await tx.insert(matches).values(seededMatches.map(({ row }) => row));
      await tx.insert(matchParticipants).values(
        seededMatches.flatMap(({ row, source }) =>
          [source.player1Name, source.player2Name].flatMap((name) => {
            if (!name) return [];
            const participantId = participantIdsByName.get(name);
            if (!participantId)
              throw new Error(`EGTS 2022 participant not found: ${name}`);
            return [{ matchId: row.id, userId: participantId }];
          }),
        ),
      );

      console.log(
        `Seeded ${TOURNAMENT_NAME}: ${data.participants.length} participants, ${data.matches.length} matches, ${data.mappools.length} beatmaps`,
      );
      return [...roomIds.values()];
    });

    try {
      const syncErrors: unknown[] = [];
      for (const roomId of seededRoomIds) {
        try {
          await syncService.sync(roomId, true);
        } catch (error) {
          syncErrors.push(error);
        }
      }
      if (syncErrors.length)
        throw new AggregateError(
          syncErrors,
          `Could not sync ${syncErrors.length} EGTS 2022 rooms`,
        );
    } finally {
      await db
        .delete(osuMultiplayerRooms)
        .where(
          and(
            notExists(
              db
                .select({ id: matches.id })
                .from(matches)
                .where(eq(matches.osuRoomId, osuMultiplayerRooms.id)),
            ),
            notExists(
              db
                .select({ id: qualificationLobbies.id })
                .from(qualificationLobbies)
                .where(
                  eq(qualificationLobbies.osuRoomId, osuMultiplayerRooms.id),
                ),
            ),
          ),
        );
    }
  } finally {
    await app.close();
  }
};

void main();
