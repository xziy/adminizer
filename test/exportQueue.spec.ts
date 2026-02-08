import { describe, it, expect } from "vitest";
import { ExportQueue } from "../src/lib/export/ExportQueue";

const waitForStatus = async (
  queue: ExportQueue,
  jobId: string,
  status: "completed" | "failed",
  timeoutMs = 1000
) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = queue.getJob(jobId);
    if (job?.status === status) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for job ${jobId} to reach ${status}`);
};

describe("ExportQueue", () => {
  it("processes queued jobs", async () => {
    const queue = new ExportQueue();
    const job = queue.enqueue(async () => ({ success: true, rowCount: 2 }));

    const completed = await waitForStatus(queue, job.id, "completed");
    expect(completed.result?.success).toBe(true);
    expect(completed.result?.rowCount).toBe(2);
  });

  it("marks failed jobs", async () => {
    const queue = new ExportQueue();
    const job = queue.enqueue(async () => {
      throw new Error("boom");
    });

    const failed = await waitForStatus(queue, job.id, "failed");
    expect(failed.error).toBe("boom");
  });
});
