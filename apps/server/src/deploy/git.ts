import { existsSync } from "node:fs";
import path from "node:path";

import { runCommandCapture } from "./command.js";

export type GitState = {
  remote: string;
  branch: string;
  commit: string;
  upstreamRef?: string;
  upstreamCommit?: string;
  behindCommits: number;
};

const runGit = async (repoRoot: string, args: string[]) => {
  const capture = await runCommandCapture("git", args, repoRoot);
  if (!capture.success) {
    throw new Error(`git ${args.join(" ")} failed: ${capture.output}`);
  }
  return capture.output;
};

const resolveUpstreamRef = async (repoRoot: string, branch: string) => {
  try {
    return await runGit(repoRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  } catch {
    const originBranch = `origin/${branch}`;
    try {
      await runGit(repoRoot, ["rev-parse", "--verify", originBranch]);
      return originBranch;
    } catch {
      return undefined;
    }
  }
};

const countBehindCommits = async (repoRoot: string, upstreamRef: string) => {
  const output = await runGit(repoRoot, ["rev-list", "--count", `HEAD..${upstreamRef}`]);
  const count = Number.parseInt(output, 10);
  if (Number.isNaN(count)) {
    throw new Error(`invalid commit count from git: ${output}`);
  }
  return count;
};

export const isGitRepository = (repoRoot: string) => existsSync(path.join(repoRoot, ".git"));

export const readGitState = async (repoRoot: string, fetch: boolean): Promise<GitState> => {
  if (!isGitRepository(repoRoot)) {
    throw new Error("当前目录不是 Git 仓库，无法执行自更新");
  }

  if (fetch) {
    await runGit(repoRoot, ["fetch", "origin"]);
  }

  const remote = await runGit(repoRoot, ["remote", "get-url", "origin"]);
  const branch = await runGit(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const commit = await runGit(repoRoot, ["rev-parse", "--short", "HEAD"]);
  const upstreamRef = await resolveUpstreamRef(repoRoot, branch);
  const upstreamCommit = upstreamRef
    ? await runGit(repoRoot, ["rev-parse", "--short", upstreamRef]).catch(() => undefined)
    : undefined;
  const behindCommits = upstreamRef ? await countBehindCommits(repoRoot, upstreamRef) : 0;

  return {
    remote,
    branch,
    commit,
    upstreamRef,
    upstreamCommit,
    behindCommits
  };
};
