import { Injectable } from '@nestjs/common';
import { StageId } from 'lib/domain/stage/stage.id';
import { QualificationResultsRepository } from './qualification-results.repository';

@Injectable()
export class QualificationResultsService {
  constructor(private readonly repository: QualificationResultsRepository) {}

  public async recalculate(stageId: StageId) {
    await this.repository.recalculate(stageId);
  }

  public invalidate(stageId: StageId) {
    return this.repository.invalidate(stageId);
  }

  public isStale(stageId: StageId) {
    return this.repository.isStale(stageId);
  }
}
