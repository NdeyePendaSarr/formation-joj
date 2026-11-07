// Lu par drizzle-kit pour générer les migrations : ce fichier n'importe que drizzle-orm.
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const slots = pgTable(
  'slots',
  {
    id: uuid('id').primaryKey(),
    // Pas de clé étrangère vers disciplines : supprimer une discipline qui a des créneaux
    // échouerait, et ce cas n'est pas dans la spec 001 (dette notée dans le plan).
    disciplineId: uuid('discipline_id').notNull(),
    // Précision milliseconde = celle de Date en JavaScript.
    startsAt: timestamp('starts_at', { withTimezone: true, precision: 3 }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, precision: 3 }).notNull(),
    capacity: integer('capacity').notNull(),
    registeredCount: integer('registered_count').notNull().default(0),
  },
  (table) => [
    check('slots_period_check', sql`${table.endsAt} > ${table.startsAt}`),
    check('slots_capacity_check', sql`${table.capacity} >= 1`),
    // Filet face à la concurrence : jamais plus d'inscrits que de places.
    check(
      'slots_registered_count_check',
      sql`${table.registeredCount} BETWEEN 0 AND ${table.capacity}`,
    ),
  ],
);

export const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey(),
  slotId: uuid('slot_id')
    .notNull()
    .references(() => slots.id),
  name: varchar('name', { length: 100 }).notNull(),
  email: text('email').notNull(),
  registeredAt: timestamp('registered_at', { withTimezone: true, precision: 3 }).notNull(),
});

export type SlotRow = typeof slots.$inferSelect;
export type RegistrationRow = typeof registrations.$inferSelect;
