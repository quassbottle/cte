import { NestFactory } from '@nestjs/core';
import { inArray } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { BeatmapId, beatmapId } from '../src/lib/domain/beatmap/beatmap.id';
import { mappoolId } from '../src/lib/domain/mappool/mappool.id';
import { matchId } from '../src/lib/domain/match/match.id';
import { stageId } from '../src/lib/domain/stage/stage.id';
import { teamId } from '../src/lib/domain/team/team.id';
import { tournamentId } from '../src/lib/domain/tournament/tournament.id';
import { UserId, userId } from '../src/lib/domain/user/user.id';
import {
  beatmaps,
  mappools,
  mappoolsBeatmaps,
  matches,
  matchParticipants,
  matchStaff,
  Schema,
  soloParticipants,
  stages,
  teamParticipants,
  teams,
  tournaments,
  users,
} from '../src/lib/infrastructure/db';
import { OsuService } from '../src/lib/infrastructure/osu/osu.service';

type SeedDb = Pick<Schema, 'delete' | 'insert' | 'select'>;

type SeedUser = {
  osuId: number;
  countryCode: string;
  seed: number;
};

type SeedBeatmap = {
  osuBeatmapId: number;
  mod: string;
  index: number;
};

type OsuBeatmapResponse = {
  id: number;
  beatmapset_id: number;
  mode: 'osu' | 'taiko' | 'fruits' | 'mania';
  version: string;
  difficulty_rating: number;
  ranked: number;
  beatmapset: {
    artist: string;
    title: string;
  };
};

const seedTournamentNames = ['Solo Tournament', 'Team Tournament'];

const seedUserCandidates = [
  124493, 7562902, 1047883, 3103765, 1601717, 7151382, 458681, 854752, 596170,
  165986, 2636633, 2, 3178418, 4504101, 4787150, 3171691, 2070907, 2558286,
  6447454, 3697591, 6304246,
];

const seedBeatmapCandidates: SeedBeatmap[] = [
  { osuBeatmapId: 827536, mod: 'NM', index: 1 },
  { osuBeatmapId: 294662, mod: 'NM', index: 2 },
  { osuBeatmapId: 221777, mod: 'HD', index: 1 },
  { osuBeatmapId: 131891, mod: 'HR', index: 1 },
  { osuBeatmapId: 75, mod: 'NM', index: 1 },
  { osuBeatmapId: 88, mod: 'NM', index: 2 },
  { osuBeatmapId: 1975197, mod: 'HD', index: 1 },
  { osuBeatmapId: 22538, mod: 'HR', index: 1 },
  { osuBeatmapId: 1001682, mod: 'NM', index: 1 },
  { osuBeatmapId: 1051305, mod: 'NM', index: 2 },
  { osuBeatmapId: 1789459, mod: 'HD', index: 1 },
  { osuBeatmapId: 2039547, mod: 'HR', index: 1 },
];

const getOsuUser = async (
  osuService: OsuService,
  osuId: number,
): Promise<{
  osuId: number;
  osuUsername: string;
  countryCode: string | null;
}> => {
  const payload = await osuService.getUserDetails({ osuUserId: osuId });
  if (payload.id !== osuId || !payload.username) {
    throw new Error(`osu user payload malformed for ${osuId}`);
  }

  return {
    osuId: payload.id,
    osuUsername: payload.username,
    countryCode: payload.countryCode,
  };
};

const getOsuBeatmap = async (
  osuService: OsuService,
  osuBeatmapId: number,
): Promise<OsuBeatmapResponse> => {
  const beatmap = await osuService.getBeatmapDetails({ osuBeatmapId });

  return {
    id: beatmap.id,
    beatmapset_id: beatmap.beatmapset_id,
    mode: beatmap.mode,
    version: beatmap.version,
    difficulty_rating: beatmap.difficulty_rating,
    ranked: beatmap.ranked,
    beatmapset: beatmap.beatmapset,
  };
};

const ensureUsers = async (
  db: SeedDb,
  osuService: OsuService,
): Promise<{
  seedUsers: SeedUser[];
  usersByOsuId: Map<number, { id: UserId; osuUsername: string }>;
}> => {
  const byOsuId = new Map<number, { id: UserId; osuUsername: string }>();
  const validSeedUsers: SeedUser[] = [];

  for (const osuId of seedUserCandidates) {
    if (validSeedUsers.length >= 12) break;

    let osuUser: {
      osuId: number;
      osuUsername: string;
      countryCode: string | null;
    };
    try {
      osuUser = await getOsuUser(osuService, osuId);
    } catch (error) {
      console.warn(
        `[seed] skipping osu user ${osuId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    const [created] = await db
      .insert(users)
      .values({
        id: userId(),
        osuId: osuUser.osuId,
        osuUsername: osuUser.osuUsername,
        countryCode: osuUser.countryCode ?? 'XX',
      })
      .onConflictDoUpdate({
        target: users.osuId,
        set: {
          osuUsername: osuUser.osuUsername,
          countryCode: osuUser.countryCode ?? 'XX',
        },
      })
      .returning();
    const seedUser = {
      osuId: osuUser.osuId,
      countryCode: osuUser.countryCode ?? 'XX',
      seed: validSeedUsers.length + 1,
    };

    byOsuId.set(osuUser.osuId, {
      id: created.id,
      osuUsername: created.osuUsername,
    });
    validSeedUsers.push(seedUser);
  }

  if (validSeedUsers.length < 12) {
    throw new Error(
      `Expected at least 12 valid osu users, got ${validSeedUsers.length}`,
    );
  }

  return { seedUsers: validSeedUsers, usersByOsuId: byOsuId };
};

const ensureBeatmaps = async (
  db: SeedDb,
  osuService: OsuService,
): Promise<{
  seedBeatmaps: SeedBeatmap[];
  beatmapsByOsuBeatmapId: Map<number, BeatmapId>;
}> => {
  const byOsuBeatmapId = new Map<number, BeatmapId>();
  const validSeedBeatmaps: SeedBeatmap[] = [];

  for (const candidate of seedBeatmapCandidates) {
    if (validSeedBeatmaps.length >= 4) break;

    let osuBeatmap: OsuBeatmapResponse;
    try {
      osuBeatmap = await getOsuBeatmap(osuService, candidate.osuBeatmapId);
    } catch (error) {
      console.warn(
        `[seed] skipping beatmap ${candidate.osuBeatmapId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    const [created] = await db
      .insert(beatmaps)
      .values({
        id: beatmapId(),
        osuBeatmapId: osuBeatmap.id,
        osuBeatmapsetId: osuBeatmap.beatmapset_id,
        artist: osuBeatmap.beatmapset.artist,
        title: osuBeatmap.beatmapset.title,
        mode: osuBeatmap.mode,
        difficultyName: osuBeatmap.version,
        difficulty: Math.round(osuBeatmap.difficulty_rating * 100) / 100,
        version: osuBeatmap.ranked,
        deleted: false,
      })
      .onConflictDoUpdate({
        target: beatmaps.osuBeatmapId,
        set: {
          osuBeatmapsetId: osuBeatmap.beatmapset_id,
          artist: osuBeatmap.beatmapset.artist,
          title: osuBeatmap.beatmapset.title,
          mode: osuBeatmap.mode,
          difficultyName: osuBeatmap.version,
          difficulty: Math.round(osuBeatmap.difficulty_rating * 100) / 100,
          version: osuBeatmap.ranked,
          deleted: false,
        },
      })
      .returning();

    byOsuBeatmapId.set(osuBeatmap.id, created.id);
    validSeedBeatmaps.push({
      ...candidate,
      osuBeatmapId: osuBeatmap.id,
    });
  }

  if (validSeedBeatmaps.length < 4) {
    throw new Error(
      `Expected at least 4 valid osu beatmaps, got ${validSeedBeatmaps.length}`,
    );
  }

  return {
    seedBeatmaps: validSeedBeatmaps,
    beatmapsByOsuBeatmapId: byOsuBeatmapId,
  };
};

const requireSeedUser = (
  usersByOsuId: Map<number, { id: UserId; osuUsername: string }>,
  osuId: number,
) => {
  const user = usersByOsuId.get(osuId);
  if (!user) {
    throw new Error(`Seed user not found: ${osuId}`);
  }
  return user;
};

const createTournamentSeed = async (
  db: SeedDb,
  params: {
    name: string;
    isTeam: boolean;
    hostId: UserId;
    seedUsers: SeedUser[];
    seedBeatmaps: SeedBeatmap[];
    usersByOsuId: Map<number, { id: UserId; osuUsername: string }>;
    beatmapsByOsuBeatmapId: Map<number, BeatmapId>;
  },
) => {
  const tournament = tournamentId();
  const qualifier = stageId();
  const finals = stageId();
  const qualifierPool = mappoolId();
  const finalsPool = mappoolId();
  const startsAt = new Date('2026-07-10T12:00:00.000Z');
  const endsAt = new Date('2026-08-01T18:00:00.000Z');

  await db.insert(tournaments).values({
    id: tournament,
    name: params.name,
    description: `${params.name} seeded schedule preview.`,
    rules: 'Seed data for local development.',
    mode: 'osu',
    isTeam: params.isTeam,
    registrationOpen: true,
    creatorId: params.hostId,
    startsAt,
    endsAt,
  });

  await db.insert(stages).values([
    {
      id: qualifier,
      name: 'Round of 48',
      tournamentId: tournament,
      startsAt: new Date('2026-07-10T12:00:00.000Z'),
      endsAt: new Date('2026-07-12T20:00:00.000Z'),
    },
    {
      id: finals,
      name: 'Finals',
      tournamentId: tournament,
      startsAt: new Date('2026-07-24T12:00:00.000Z'),
      endsAt: new Date('2026-07-26T20:00:00.000Z'),
    },
  ]);

  await db.insert(mappools).values([
    {
      id: qualifierPool,
      stageId: qualifier,
      startsAt: new Date('2026-07-09T12:00:00.000Z'),
      endsAt: new Date('2026-07-12T20:00:00.000Z'),
      hidden: false,
    },
    {
      id: finalsPool,
      stageId: finals,
      startsAt: new Date('2026-07-23T12:00:00.000Z'),
      endsAt: new Date('2026-07-26T20:00:00.000Z'),
      hidden: false,
    },
  ]);

  await db.insert(mappoolsBeatmaps).values(
    params.seedBeatmaps.map((seedBeatmap, index) => ({
      mappoolId: index < 2 ? qualifierPool : finalsPool,
      beatmapId: params.beatmapsByOsuBeatmapId.get(seedBeatmap.osuBeatmapId)!,
      mod: seedBeatmap.mod,
      index: seedBeatmap.index,
    })),
  );

  const matchPairs = [
    [params.seedUsers[0].osuId, params.seedUsers[1].osuId],
    [params.seedUsers[2].osuId, params.seedUsers[3].osuId],
    [params.seedUsers[4].osuId, params.seedUsers[5].osuId],
    [params.seedUsers[6].osuId, params.seedUsers[7].osuId],
  ] as const;

  const staffUsers = {
    referee: requireSeedUser(params.usersByOsuId, params.seedUsers[8].osuId),
    streamer: requireSeedUser(params.usersByOsuId, params.seedUsers[9].osuId),
    commentatorA: requireSeedUser(
      params.usersByOsuId,
      params.seedUsers[10].osuId,
    ),
    commentatorB: requireSeedUser(
      params.usersByOsuId,
      params.seedUsers[11].osuId,
    ),
  };

  if (params.isTeam) {
    for (let index = 0; index < matchPairs.length; index += 1) {
      const [captainOsuId, teammateOsuId] = matchPairs[index];
      const captain = requireSeedUser(params.usersByOsuId, captainOsuId);
      const teammate = requireSeedUser(params.usersByOsuId, teammateOsuId);
      const createdTeamId = teamId();

      await db.insert(teams).values({
        id: createdTeamId,
        name: `Team ${index + 1}`,
        captainId: captain.id,
        tournamentId: tournament,
      });
      await db.insert(teamParticipants).values([
        {
          teamId: createdTeamId,
          userId: captain.id,
          seed: params.seedUsers.find((user) => user.osuId === captainOsuId)
            ?.seed,
        },
        {
          teamId: createdTeamId,
          userId: teammate.id,
          seed: params.seedUsers.find((user) => user.osuId === teammateOsuId)
            ?.seed,
        },
      ]);
    }
  } else {
    await db.insert(soloParticipants).values(
      params.seedUsers.slice(0, 8).map((seedUser) => ({
        tournamentId: tournament,
        userId: requireSeedUser(params.usersByOsuId, seedUser.osuId).id,
        seed: seedUser.seed,
      })),
    );
  }

  for (let index = 0; index < matchPairs.length; index += 1) {
    const [leftOsuId, rightOsuId] = matchPairs[index];
    const left = requireSeedUser(params.usersByOsuId, leftOsuId);
    const right = requireSeedUser(params.usersByOsuId, rightOsuId);
    const currentMatchId = matchId();
    const stage = index < 3 ? qualifier : finals;

    await db.insert(matches).values({
      id: currentMatchId,
      name: `Match ${index + 1}`,
      stageId: stage,
      matchNumber: index + 1,
      creatorId: params.hostId,
      startsAt: new Date(Date.UTC(2026, 6, 10 + index, 16, 0, 0)),
      endsAt: new Date(Date.UTC(2026, 6, 10 + index, 17, 30, 0)),
      mpUrl: `https://osu.ppy.sh/community/matches/${1000000 + index}`,
      vodUrl: `https://www.twitch.tv/videos/${1000000 + index}`,
    });

    await db.insert(matchParticipants).values([
      {
        matchId: currentMatchId,
        userId: left.id,
        score: index === 3 ? null : 6,
        isWinner: index === 3 ? null : true,
      },
      {
        matchId: currentMatchId,
        userId: right.id,
        score: index === 3 ? null : index + 1,
        isWinner: index === 3 ? null : false,
      },
    ]);

    await db.insert(matchStaff).values([
      {
        matchId: currentMatchId,
        userId: staffUsers.referee.id,
        role: 'referee',
      },
      {
        matchId: currentMatchId,
        userId: staffUsers.streamer.id,
        role: 'streamer',
      },
      {
        matchId: currentMatchId,
        userId: staffUsers.commentatorA.id,
        role: 'commentator',
      },
      {
        matchId: currentMatchId,
        userId: staffUsers.commentatorB.id,
        role: 'commentator',
      },
    ]);
  }

  return tournament;
};

const main = async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const db = app.get<Schema>('DB');
    const osuService = app.get(OsuService);
    const { seedUsers, usersByOsuId } = await ensureUsers(db, osuService);
    const { seedBeatmaps, beatmapsByOsuBeatmapId } = await ensureBeatmaps(
      db,
      osuService,
    );
    const hostId = requireSeedUser(usersByOsuId, seedUsers[0].osuId).id;

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: tournaments.id })
        .from(tournaments)
        .where(inArray(tournaments.name, seedTournamentNames));

      if (existing.length > 0) {
        await tx.delete(tournaments).where(
          inArray(
            tournaments.id,
            existing.map((tournament) => tournament.id),
          ),
        );
      }

      const soloTournamentId = await createTournamentSeed(tx, {
        name: 'Solo Tournament',
        isTeam: false,
        hostId,
        seedUsers,
        seedBeatmaps,
        usersByOsuId,
        beatmapsByOsuBeatmapId,
      });

      const teamTournamentId = await createTournamentSeed(tx, {
        name: 'Team Tournament',
        isTeam: true,
        hostId,
        seedUsers,
        seedBeatmaps,
        usersByOsuId,
        beatmapsByOsuBeatmapId,
      });

      console.log(`Seeded Solo Tournament: ${soloTournamentId}`);
      console.log(`Seeded Team Tournament: ${teamTournamentId}`);
    });
  } finally {
    await app.close();
  }
};

void main();
