import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { Registration } from '../domain/registration';
import { Slot } from '../domain/slot';
import { DrizzleSlotRepository } from './drizzle-slot.repository';
import { registrations, slots } from './volunteers.schema';

const NOW = new Date('2026-11-01T08:00:00.123Z');

const newSlot = (capacity = 2) =>
  Slot.create({
    id: randomUUID(),
    disciplineId: randomUUID(),
    startsAt: new Date('2026-11-02T09:00:00.000Z'),
    endsAt: new Date('2026-11-02T12:00:00.000Z'),
    capacity,
  });

const volunteer = (name: string) => ({
  id: randomUUID(),
  name,
  email: `${name.toLowerCase()}@example.sn`,
  now: NOW,
});

/** Drizzle enveloppe l'erreur Postgres : on remonte `cause` jusqu'à la contrainte. */
function violatedConstraint(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ('constraint' in current && typeof current.constraint === 'string') {
      return current.constraint;
    }
  }
  return undefined;
}

describe('DrizzleSlotRepository (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let repository: DrizzleSlotRepository;

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    repository = new DrizzleSlotRepository(connection.db);
  });

  afterAll(() => connection?.close());

  const storedRegistrations = (slotId: string) =>
    connection.db.select().from(registrations).where(eq(registrations.slotId, slotId));

  /** Un créneau de capacité 2 où Awa est déjà inscrite : il reste une place. */
  async function slotWithAwa(): Promise<Slot> {
    const slot = newSlot();
    await repository.insert(slot);
    const awa = slot.register(volunteer('Awa'));
    await repository.addRegistration(slot, awa);
    return slot;
  }

  it('001-AS1: reads back exactly the slot it wrote', async () => {
    const slot = newSlot();
    await repository.insert(slot);

    expect(await repository.findById(slot.id)).toEqual(slot);
    expect(await repository.findById(randomUUID())).toBeNull();
  });

  it('001-AS7: never registers beyond capacity when the slot filled meanwhile', async () => {
    const slot = await slotWithAwa();
    // Deux lectures du même créneau, chacune voit encore une place libre.
    const first = await repository.findById(slot.id);
    const second = await repository.findById(slot.id);
    if (!first || !second) throw new Error('slot not stored');
    const moussa = first.register(volunteer('Moussa'));
    const fatou = second.register(volunteer('Fatou'));

    await repository.addRegistration(first, moussa);
    await expect(repository.addRegistration(second, fatou)).rejects.toMatchObject({
      code: 'SLOT_FULL',
    });

    expect((await repository.findById(slot.id))?.registeredCount).toBe(2);
    expect((await storedRegistrations(slot.id)).map((row) => row.name).sort()).toEqual([
      'Awa',
      'Moussa',
    ]);
  });

  it('001-AS7: the database refuses a registered count above capacity', async () => {
    const slot = newSlot();
    await repository.insert(slot);

    const overflow = connection.db
      .update(slots)
      .set({ registeredCount: 3 })
      .where(eq(slots.id, slot.id));

    await expect(overflow).rejects.toSatisfy(
      (error) => violatedConstraint(error) === 'slots_registered_count_check',
    );
    expect((await repository.findById(slot.id))?.registeredCount).toBe(0);
  });

  it('001-AS7: keeps the place when the registration insert fails', async () => {
    const slot = await slotWithAwa();
    const [awaRow] = await storedRegistrations(slot.id);
    if (!awaRow) throw new Error('registration not stored');
    // Même identifiant qu'Awa : l'insertion échoue après l'incrément, qui doit être annulé.
    const duplicate = Registration.restore({
      id: awaRow.id,
      slotId: slot.id,
      name: 'Moussa',
      email: 'moussa@example.sn',
      registeredAt: NOW,
    });

    await expect(repository.addRegistration(slot, duplicate)).rejects.toSatisfy(
      (error) => violatedConstraint(error) === 'registrations_pkey',
    );

    expect((await repository.findById(slot.id))?.registeredCount).toBe(1);
    expect(await storedRegistrations(slot.id)).toHaveLength(1);
  });
});
