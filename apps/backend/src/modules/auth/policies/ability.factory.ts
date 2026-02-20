import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { DbUser } from 'lib/infrastructure/db';
import { AppAbility, AppSubjectName } from './types';

@Injectable()
export class AppAbilityFactory {
  public createForUser(user: DbUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === 'admin') {
      can('manage', 'all');
    } else {
      can(['create', 'update', 'delete'], 'Stage', {
        tournamentCreatorId: user.id,
      });
      can(['create', 'update', 'delete'], 'Mappool', {
        tournamentCreatorId: user.id,
      });
    }

    return build({
      detectSubjectType: (subject) =>
        (subject as { __type: AppSubjectName }).__type,
    });
  }
}
