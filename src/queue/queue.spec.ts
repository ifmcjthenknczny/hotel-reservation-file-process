import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';

describe('Queue', () => {
  let provider: Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Queue],
    }).compile();

    provider = module.get<Queue>(Queue);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
