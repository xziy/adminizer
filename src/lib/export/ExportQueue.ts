import { randomUUID } from "node:crypto";
import type { ExportResult } from "./types";

export type ExportJobStatus = "queued" | "processing" | "completed" | "failed";

export type ExportJob = {
  id: string;
  status: ExportJobStatus;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  result?: ExportResult;
  error?: string;
};

type ExportTask = () => Promise<ExportResult>;

type QueueItem = {
  id: string;
  task: ExportTask;
};

export class ExportQueue {
  private readonly jobs = new Map<string, ExportJob>();
  private readonly pending: QueueItem[] = [];
  private processing = false;

  enqueue(task: ExportTask): ExportJob {
    const id = randomUUID();
    const job: ExportJob = {
      id,
      status: "queued",
      createdAt: new Date()
    };
    this.jobs.set(id, job);
    this.pending.push({ id, task });
    void this.runNext();
    return job;
  }

  getJob(id: string): ExportJob | undefined {
    return this.jobs.get(id);
  }

  listJobs(): ExportJob[] {
    return Array.from(this.jobs.values());
  }

  private async runNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    const next = this.pending.shift();
    if (!next) {
      return;
    }

    const job = this.jobs.get(next.id);
    if (job) {
      job.status = "processing";
      job.startedAt = new Date();
    }

    this.processing = true;

    try {
      const result = await next.task();
      if (job) {
        job.status = result.success ? "completed" : "failed";
        job.result = result;
        job.error = result.success ? undefined : result.error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (job) {
        job.status = "failed";
        job.error = message;
      }
    } finally {
      if (job) {
        job.finishedAt = new Date();
      }
      this.processing = false;
      if (this.pending.length > 0) {
        void this.runNext();
      }
    }
  }
}
