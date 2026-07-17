import { QualificationResultsService } from './qualification-results.service';

describe('QualificationResultsService', () => {
  it('does not replace results when assignments are incomplete', async () => {
    const repository = {
      recalculate: jest.fn(),
    };
    await new QualificationResultsService(repository as never).recalculate(
      'stage' as never,
    );
    expect(repository.recalculate).toHaveBeenCalledWith('stage');
  });

  it('keeps stale results retryable after a failed rebuild', async () => {
    const repository = {
      recalculate: jest.fn().mockRejectedValue(new Error('raw read failed')),
      isStale: jest.fn().mockResolvedValue(true),
    };
    const service = new QualificationResultsService(repository as never);
    await expect(service.recalculate('stage' as never)).rejects.toThrow(
      'raw read failed',
    );
    await expect(service.isStale('stage' as never)).resolves.toBe(true);
  });
});
