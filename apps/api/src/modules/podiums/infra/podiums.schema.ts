// Lu par drizzle-kit pour générer les migrations : ce fichier n'importe que drizzle-orm.
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/** Les épreuves et leur résultat officiel, chargés seulement par les données de départ. */
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    // Nuls tous les trois tant que le résultat officiel n'est pas connu. Trois colonnes ne
    // supportent pas deux bronzes ni les ex aequo : dette notée dans le plan 002 (TR7).
    officialGoldBib: integer('official_gold_bib'),
    officialSilverBib: integer('official_silver_bib'),
    officialBronzeBib: integer('official_bronze_bib'),
  },
  (table) => [
    // Un résultat officiel est complet et sans doublon, ou absent : jamais à moitié.
    check(
      'events_official_result_check',
      sql`(${table.officialGoldBib} IS NULL AND ${table.officialSilverBib} IS NULL AND ${table.officialBronzeBib} IS NULL)
        OR (${table.officialGoldBib} IS NOT NULL AND ${table.officialSilverBib} IS NOT NULL AND ${table.officialBronzeBib} IS NOT NULL
          AND ${table.officialGoldBib} <> ${table.officialSilverBib}
          AND ${table.officialGoldBib} <> ${table.officialBronzeBib}
          AND ${table.officialSilverBib} <> ${table.officialBronzeBib})`,
    ),
  ],
);

export const podiumPosts = pgTable(
  'podium_posts',
  {
    id: uuid('id').primaryKey(),
    // Ordre de publication : deux posts de la même milliseconde gardent leur ordre d'arrivée.
    seq: integer('seq').generatedAlwaysAsIdentity().notNull(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id),
    journalistName: varchar('journalist_name', { length: 100 }).notNull(),
    goldBib: integer('gold_bib').notNull(),
    silverBib: integer('silver_bib').notNull(),
    bronzeBib: integer('bronze_bib').notNull(),
    status: text('status').notNull(),
    // Précision milliseconde = celle de Date en JavaScript.
    postedAt: timestamp('posted_at', { withTimezone: true, precision: 3 }).notNull(),
  },
  (table) => [
    check(
      'podium_posts_distinct_bibs_check',
      sql`${table.goldBib} <> ${table.silverBib} AND ${table.goldBib} <> ${table.bronzeBib} AND ${table.silverBib} <> ${table.bronzeBib}`,
    ),
    // Filet : seul un podium certifié est publié. La tranche 2 ajoutera PROVISOIRE et REJETE.
    check('podium_posts_status_check', sql`${table.status} = 'VALIDE'`),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type PodiumPostRow = typeof podiumPosts.$inferSelect;
