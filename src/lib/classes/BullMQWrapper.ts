import { Queue, Worker, Job, JobScheduler, type JobsOptions } from "bullmq";
import type { Redis } from "ioredis";
import { Log } from "./Logger.js";

const logger = Log.getInstance().extend("BullMQ");

export type JobProcessorMap = {
  [jobName: string]: (data: {scheduleUuid: string}) => Promise<any>;
};

export interface BullMQConfig {
  concurrency?: number;
  lockDuration?: number;
  maxStalledCount?: number;
  stalledInterval?: number;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: number | string;
    removeOnComplete?: number | boolean;
    removeOnFail?: number | boolean;
    delay?: number;
  };
}

export class BullMQWrapper {
  private queue: Queue;
  private worker: Worker;
  private scheduler: JobScheduler;
  private readonly jobProcessors: JobProcessorMap;
  private readonly connection: Redis;
  private readonly config: BullMQConfig;

  constructor(
      queueName: string,
      connection: Redis,
      jobProcessors: JobProcessorMap,
      config: BullMQConfig = {}
  ) {
    this.jobProcessors = jobProcessors;
    this.connection = connection;
    this.config = {
      concurrency: 5, // Reduced from 10 for better stability
      lockDuration: 600000, // 10 minutes (increased from 6)
      maxStalledCount: 1,
      stalledInterval: 30000,
      defaultJobOptions: {
        attempts: 5,
        backoff: 3,
        removeOnComplete: 50,
        removeOnFail: 100,
      },
      ...config,
    };

    this.queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: this.config.defaultJobOptions as JobsOptions,
    });

    this.scheduler = new JobScheduler(queueName, {
      connection: this.connection,
    });

    this.worker = new Worker(
        queueName,
        async (job: Job) => this.processJob(job),
        {
          connection: this.connection,
          concurrency: this.config.concurrency!,
          lockDuration: this.config.lockDuration!,
          maxStalledCount: this.config.maxStalledCount!,
          stalledInterval: this.config.stalledInterval!,
        },
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on("completed", (job) => {
      const duration = job.finishedOn ? job.finishedOn - (job.processedOn || job.timestamp) : 0;
      logger.info(`Job ${job.id} of type "${job.name}" completed in ${duration}ms.`);
    });

    this.worker.on("failed", (job, err) => {
      const attemptsMade = job?.attemptsMade || 0;
      const maxAttempts = job?.opts?.attempts || this.config.defaultJobOptions?.attempts || 1;

      logger.error(`Job ${job?.id ?? "unknown"} failed (attempt ${attemptsMade}/${maxAttempts}): ${err.message}`, {
        jobName: job?.name,
        clientUuid: job?.data?.clientUuid,
        error: err.message,
        stack: err.stack,
      });
    });

    this.worker.on("stalled", (jobId) => {
      logger.warn(`Job ${jobId} stalled and will be retried`);
    });

    this.worker.on("progress", (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}%`);
    });

    this.queue.on("error", (error) => {
      logger.error("Queue error:", error);
    });

    this.queue.on("waiting", (job) => {
      logger.debug(`Job ${job.id} is waiting`);
    });
  }

  private async processJob(job: Job): Promise<any> {
    logger.info(
        `Processing job "${job.name}" with data: ${JSON.stringify(job.data)}`,
    );
    const processor = this.jobProcessors[job.name];
    if (!processor) {
      throw new Error(`No processor defined for job type "${job.name}"`);
    }
    return await processor(job.data);
  }

  async addJob(name: string, data: any, options?: JobsOptions): Promise<Job> {
    return await this.queue.add(name, data, options);
  }

  async addScheduledJob(
      name: string,
      data: any,
      cron: string,
      schedulerId: string,
      tz?: string
  ): Promise<Job | undefined> {
    try {
      const jobSchedulerId = `sched:${name}:${schedulerId}${tz ? `:${tz}` : ""}`;

      return await this.queue.upsertJobScheduler(
          jobSchedulerId,
          { pattern: cron, tz: tz ?? data.timeZone },
          {
            name,
            data,
            opts: {
              backoff: Number(this.config.defaultJobOptions?.backoff) || 3,
              attempts: Number(this.config.defaultJobOptions?.attempts) || 5,
              removeOnFail: this.config.defaultJobOptions?.removeOnFail || 100,
              removeOnComplete: this.config.defaultJobOptions?.removeOnComplete || 50,
            },
          },
      );
    } catch (error: any) {
      logger.error(
          `Error adding scheduled job "${name}" with cron "${cron}": ${error.message}`,
      );
      return undefined;
    }
  }

  async removeScheduledJob(jobId: string): Promise<void> {
    try {
      await this.scheduler.removeJobScheduler(jobId);
      logger.info(`Scheduled job with ID ${jobId} removed.`);
    } catch (error: any) {
      logger.error(`Error removing scheduled job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  async listScheduledJobs(): Promise<any[]> {
    try {
      return await this.scheduler.getJobSchedulers(0, 100, true); // Increased limit
    } catch (error: any) {
      logger.error(`Error listing scheduled jobs: ${error.message}`);
      return [];
    }
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      return await this.queue.getJob(jobId);
    } catch (error: any) {
      logger.error(`Error getting job ${jobId}: ${error.message}`);
      return null;
    }
  }

  async removeJob(jobId: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Job with ID ${jobId} removed.`);
      } else {
        logger.warn(`Job with ID ${jobId} not found.`);
      }
    } catch (error: any) {
      logger.error(`Error removing job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  // Enhanced queue management methods
  async getQueueCounts(): Promise<{ [p: string]: number }> {
    try {
      return await this.queue.getJobCounts();
    } catch (error: any) {
      logger.error(`Error getting queue counts: ${error.message}`);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      };
    }
  }

  async getWaitingJobs(start = 0, end = 10): Promise<Job[]> {
    return await this.queue.getJobs(["waiting"], start, end);
  }

  async getActiveJobs(start = 0, end = 10): Promise<Job[]> {
    return await this.queue.getJobs(["active"], start, end);
  }

  async getCompletedJobs(start = 0, end = 10): Promise<Job[]> {
    return await this.queue.getJobs(["completed"], start, end);
  }

  async getFailedJobs(start = 0, end = 10): Promise<Job[]> {
    return await this.queue.getJobs(["failed"], start, end);
  }

  async getDelayedJobs(start = 0, end = 10): Promise<Job[]> {
    return await this.queue.getJobs(["delayed"], start, end);
  }

  async retryFailedJobs(limit = 10): Promise<number> {
    const failedJobs = await this.getFailedJobs(0, limit);
    let retried = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
        logger.info(`Retried failed job ${job.id}`);
      } catch (error) {
        logger.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    return retried;
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    logger.info("Queue paused");
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    logger.info("Queue resumed");
  }

  async isPaused(): Promise<boolean> {
    return await this.queue.isPaused();
  }

  async drainAndClean(): Promise<void> {
    try {
      await this.queue.drain();
      const jobTypes = [
        "completed",
        "failed",
        "delayed",
        "wait",
        "active",
        "paused",
        "prioritized",
      ] as const;

      for (const type of jobTypes) {
        try {
          const removedCount = await this.queue.clean(0, 1000, type);
          logger.info(`Removed ${removedCount} "${type}" jobs.`);
        } catch (cleanError) {
          logger.warn(`Failed to clean ${type} jobs:`, cleanError);
        }
      }
      logger.info("Queue has been drained and cleaned up.");
    } catch (error: any) {
      logger.error(`Error during drain and clean: ${error.message}`);
      throw error;
    }
  }

  async getQueueHealth(): Promise<{
    isHealthy: boolean;
    counts: any;
    isPaused: boolean;
    stalledCount: number;
    timestamp: string;
  }> {
    try {
      const counts = await this.getQueueCounts();
      const isPaused = await this.isPaused();
      const stalledCount = counts.active; // Approximation

      const isHealthy = !isPaused && counts.failed < 100; // Simple health check

      return {
        isHealthy,
        counts,
        isPaused,
        stalledCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        isHealthy: false,
        counts: {},
        isPaused: true,
        stalledCount: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async close(): Promise<void> {
    try {
      await this.worker.close();
      await this.queue.close();
      await this.scheduler.close();
      logger.info("BullMQ connections closed.");
    } catch (error: any) {
      logger.error(`Error closing BullMQ connections: ${error.message}`);
    } finally {
      if (this.connection.status === "ready") {
        this.connection.disconnect();
        logger.info("Redis connection disconnected.");
      }
    }
  }
}