import { Queue, Worker, Job, JobScheduler, type JobsOptions } from "bullmq";
import type { Redis } from "ioredis";
import type { ReportJobData } from "../interfaces/ReportsInterfaces.js";
import { Log } from "./Logger.js";

const logger = Log.getInstance().extend("BullMQ");

export type JobProcessorMap = {
  [jobName: string]: (data: ReportJobData) => Promise<any>;
};

export class BullMQWrapper {
  private queue: Queue;
  private worker: Worker;
  private scheduler: JobScheduler;
  private readonly jobProcessors: JobProcessorMap;
  private readonly connection: Redis;

  constructor(
    queueName: string,
    connection: Redis,
    jobProcessors: JobProcessorMap,
  ) {
    this.jobProcessors = jobProcessors;
    this.connection = connection;

    this.queue = new Queue(queueName, { connection: this.connection });
    this.scheduler = new JobScheduler(queueName, {
      connection: this.connection,
    });

    this.worker = new Worker(
      queueName,
      async (job: Job) => this.processJob(job),
      { connection: this.connection, concurrency: 1, lockDuration: 360000 },
    );

    this.worker.on("completed", (job) => {
      logger.info(`Job ${job.id} of type "${job.name}" completed.`);
    });

    this.worker.on("failed", (job, err) => {
      logger.error(`Job ${job?.id ?? "unknown"} failed: ${err.message}`);
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
  ): Promise<Job | undefined> {
    try {
      const jobId = `cron:${name}:${Buffer.from(cron).toString("base64")}`;
      return await this.queue.upsertJobScheduler(
        jobId,
        { pattern: cron, tz: data.timeZone },
        {
          name: name,
          data: data,
          opts: {
            backoff: 3,
            attempts: 5,
            removeOnFail: 1000,
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
      return await this.scheduler.getJobSchedulers(0, 9, true);
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
      ];
      for (const type of jobTypes) {
        // @ts-ignore
        const removedCount = await this.queue.clean(0, 1000, type);
        logger.info(`Removed ${removedCount} "${type}" jobs.`);
      }
      logger.info("Queue has been drained and cleaned up.");
    } catch (error: any) {
      logger.error(`Error during drain and clean: ${error.message}`);
      throw error;
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
      // It's good practice to disconnect the Redis connection if it's managed externally
      if (this.connection.status === "ready") {
        this.connection.disconnect();
        logger.info("Redis connection disconnected.");
      }
    }
  }
}
