import { JetStreamClient, JetStreamManager } from '@nats-io/jetstream';
import { DI_TOKENS } from 'infrastructure/di/tokens';
import { inject, injectable } from 'tsyringe';
import { JetStreamSubject, JetStreamSubjectPayloadMap } from './constants';

@injectable()
export class JetStreamPublisher {
  constructor(
    @inject(DI_TOKENS.jetstreamManager) private readonly jcm: JetStreamManager,
    @inject(DI_TOKENS.jetstreamClient) private readonly jcc: JetStreamClient,
  ) {}

  public publish<TSubject extends JetStreamSubject>(params: {
    subject: JetStreamSubject;
    payload: JetStreamSubjectPayloadMap[TSubject];
  }) {
    const { subject, payload } = params;

    return this.jcc.publish(subject, JSON.stringify(payload));
  }
}
