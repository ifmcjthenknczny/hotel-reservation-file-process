// import { processFile } from '../processor/processor';
// import { Queue, Worker } from 'bullmq';

// const redisConnection = { host: 'localhost', port: 6379 };

export const QUEUE_NAME = 'task_queue';

// const queue = new Queue(QUEUE_NAME, { connection: redisConnection });

// const worker = new Worker(
//   QUEUE_NAME,
//   async (job) => {
//     await processFile(job.data.filePath);
//   },
//   { connection: redisConnection },
// );

// worker.on('completed', (job) => console.log(`✅ Job ${job.id} completed`));
// worker.on('failed', (job, err) =>
//   console.error(`❌ Job ${job?.id} failed: ${err.message}`),
// );

// export { queue };
