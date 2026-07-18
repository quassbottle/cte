import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('migration journal', () => {
  it('contains the generated migrations in order', () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'drizzle/meta/_journal.json'),
        'utf8',
      ),
    ) as { entries: { idx: number; tag: string }[] };

    expect(journal.entries).toEqual([
      expect.objectContaining({
        idx: 0,
        tag: '0000_ambitious_bastion',
      }),
      expect.objectContaining({
        idx: 1,
        tag: '0001_mappool-beatmap-position',
      }),
      expect.objectContaining({
        idx: 2,
        tag: '0002_qualification-calculated-at-nullable',
      }),
    ]);
  });

  it('seeds the global staff roles in the baseline migration', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'drizzle/0000_ambitious_bastion.sql'),
      'utf8',
    );

    expect(sql).toContain("'Host'");
    expect(sql).toContain("'Referee'");
    expect(sql).toContain("'Mapper'");
    expect(sql).toContain("'Commentator'");
    expect(sql).toContain("'Streamer'");
    expect(sql).toContain("'Playtester'");
  });
});
