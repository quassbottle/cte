import { JetStreamClient, JetStreamManager } from '@nats-io/jetstream';
import { createHash } from 'crypto';
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
    subject: TSubject;
    payload: JetStreamSubjectPayloadMap[TSubject];
  }) {
    const { subject, payload } = params;
    const payloadJson = JSON.stringify(payload);
    const msgID = createHash('sha256')
      .update(subject)
      .update(payloadJson)
      .digest('hex');

    return this.jcc.publish(subject, payloadJson, { msgID });
  }
}
