import { processFile } from '../processor/processor';
import { Queue, Worker } from 'bullmq';

const redisConnection = { host: 'localhost', port: 6379 };

const queue = new Queue('file-processing', { connection: redisConnection });

const worker = new Worker(
  'file-processing',
  async (job) => {
    await processFile(job.data.filePath);
  },
  { connection: redisConnection },
);

worker.on('completed', (job) => console.log(`✅ Job ${job.id} completed`));
worker.on('failed', (job, err) =>
  console.error(`❌ Job ${job?.id} failed: ${err.message}`),
);

export { queue };
