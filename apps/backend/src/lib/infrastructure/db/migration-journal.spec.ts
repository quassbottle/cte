import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type JournalEntry = { idx: number; tag: string; when: number };

describe('migration journal', () => {
  it('preserves published timestamps and orders new migrations after them', () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'drizzle/meta/_journal.json'),
        'utf8',
      ),
    ) as { entries: JournalEntry[] };
    const entries = new Map(journal.entries.map((entry) => [entry.tag, entry]));
    const published = {
      '0010_handy_registration_switch': 1771761600000,
      '0011_tan_hidden_mappools': 1771804800000,
      '0012_add_user_default_mode': 1782302400000,
      '0013_add_tournament_archived_at': 1782306000000,
      '0014_add_match_schedule_fields': 1782392400000,
    };

    for (const [tag, when] of Object.entries(published)) {
      expect(entries.get(tag)?.when).toBe(when);
    }

    const ordered = journal.entries.filter(({ idx }) => idx >= 14 && idx <= 18);
    expect(ordered.map(({ idx }) => idx)).toEqual([14, 15, 16, 17, 18]);
    expect(
      ordered.every(
        (entry, index) => !index || entry.when > ordered[index - 1].when,
      ),
    ).toBe(true);
  });

  it('seeds the global staff roles in the staff migration', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'drizzle/0019_tearful_the_phantom.sql'),
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
