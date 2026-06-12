import { mockGenerateProjectAsset } from "./mock.js";
import { makeId, now } from "./store.js";
import type { Project } from "./types.js";

export type AssetGenerateJobStatus = "queued" | "running" | "succeeded" | "failed";

export type AssetGenerateJobInput = {
  prompt: string;
  label?: string;
  imageId?: string;
  artStyleId?: string;
};

export type AssetGenerateJobResult = {
  imageUrl: string;
  prompt: string;
};

export type AssetGenerateJob = {
  id: string;
  projectId: string;
  status: AssetGenerateJobStatus;
  startedAt: string;
  finishedAt?: string;
  input: AssetGenerateJobInput;
  result?: AssetGenerateJobResult;
  error?: string;
};

const jobs = new Map<string, AssetGenerateJob>();

let generateDelayMs = Number(process.env.MOCK_ASSET_GENERATE_MS ?? 4000);

export const setAssetGenerateDelayMs = (value: number) => {
  generateDelayMs = value;
};

export const resetAssetGenerateJobs = () => {
  jobs.clear();
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getAssetGenerateJob = (projectId: string, jobId: string) => {
  const job = jobs.get(jobId);
  if (!job || job.projectId !== projectId) {
    return null;
  }
  return job;
};

export const startAssetGenerateJob = (project: Project, input: AssetGenerateJobInput) => {
  const id = makeId("asset_gen");
  const job: AssetGenerateJob = {
    id,
    projectId: project.id,
    status: "queued",
    startedAt: now(),
    input
  };
  jobs.set(id, job);

  void runAssetGenerateJob(project, id);

  return job;
};

async function runAssetGenerateJob(project: Project, jobId: string) {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }

  job.status = "running";
  jobs.set(jobId, job);

  try {
    if (generateDelayMs > 0) {
      await sleep(generateDelayMs);
    }

    const result = await mockGenerateProjectAsset(project, job.input);
    job.status = "succeeded";
    job.result = result;
    job.finishedAt = now();
    jobs.set(jobId, job);
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Asset generation failed";
    job.finishedAt = now();
    jobs.set(jobId, job);
  }
}
