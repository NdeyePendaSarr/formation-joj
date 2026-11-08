import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { DisciplinesModule } from './modules/disciplines/disciplines.module';
import { PodiumsModule } from './modules/podiums/podiums.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';

@Module({
  imports: [CoreModule, DisciplinesModule, VolunteersModule, PodiumsModule],
})
export class AppModule {}
