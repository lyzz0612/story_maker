import { readFileSync } from "node:fs";
import path from "node:path";

import type { DeployConfig } from "./config.js";
import { pnpmProgram, runCommandCapture, type CommandCapture } from "./command.js";
import { readGitState } from "./git.js";
import { getDeployState, setDeployState } from "./runner.js";

export type GitDeployInfo = {
  updateSupported: boolean;
  gitRemote?: string;
  gitBranch?: string;
  gitCommit?: string;
  gitUpstreamCommit?: string;
  updateAvailable: boolean;
  behindCommits: number;
};

export type DeployPullResult = {
  success: boolean;
  message: string;
  output: string;
  version: string;
  gitCommit?: string;
  restartRequired: boolean;
};

let updateInProgress = false;

const readPackageVersion = (repoRoot: string) => {
  try {
    const packagePath = path.join(repoRoot, "apps/web/package.json");
    const payload = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: string };
    return payload.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
};

export const gitInfoFromState = async (
  repoRoot: string,
  fetch = false
): Promise<GitDeployInfo> => {
  try {
    const git = await readGitState(repoRoot, fetch);
    return {
      updateSupported: true,
      gitRemote: git.remote,
      gitBranch: git.branch,
      gitCommit: git.commit,
      gitUpstreamCommit: git.upstreamCommit,
      updateAvailable: git.behindCommits > 0,
      behindCommits: git.behindCommits
    };
  } catch {
    return {
      updateSupported: false,
      updateAvailable: false,
      behindCommits: 0
    };
  }
};

const appendStep = async (
  output: string[],
  success: { value: boolean },
  label: string,
  run: () => Promise<CommandCapture>
) => {
  output.push(`$ ${label}`);
  try {
    const capture = await run();
    if (capture.output) {
      output.push(capture.output);
    }
    if (!capture.success) {
      success.value = false;
    }
  } catch (error) {
    success.value = false;
    output.push(error instanceof Error ? error.message : String(error));
  }
  output.push("");
};

export const checkForUpdates = async (config: DeployConfig): Promise<GitDeployInfo> =>
  gitInfoFromState(config.repoPath, true);

export const pullAndBuild = async (config: DeployConfig): Promise<DeployPullResult> => {
  if (updateInProgress || getDeployState().status === "running") {
    return {
      success: false,
      message: "已有更新任务在运行，请稍后再试。",
      output: "",
      version: readPackageVersion(config.repoPath),
      restartRequired: false
    };
  }

  updateInProgress = true;
  const startedAt = new Date().toISOString();
  const branch = config.branch;

  setDeployState({
    status: "running",
    startedAt,
    branch
  });

  try {
    const git = await readGitState(config.repoPath, true);

    if (git.behindCommits === 0) {
      const version = readPackageVersion(config.repoPath);
      setDeployState({
        status: "succeeded",
        startedAt,
        finishedAt: new Date().toISOString(),
        branch
      });
      return {
        success: true,
        message: "当前已是最新版本，无需拉取。",
        output: "",
        version,
        gitCommit: git.commit,
        restartRequired: false
      };
    }

    const lines: string[] = [];
    const success = { value: true };

    await appendStep(lines, success, `git pull --ff-only origin ${git.branch}`, () =>
      runCommandCapture("git", ["pull", "--ff-only", "origin", git.branch], config.repoPath)
    );

    if (success.value) {
      await appendStep(lines, success, "corepack enable", () =>
        runCommandCapture("corepack", ["enable"], config.repoPath)
      );
    }

    if (success.value) {
      await appendStep(lines, success, "pnpm install --frozen-lockfile", () =>
        runCommandCapture(pnpmProgram(), ["install", "--frozen-lockfile"], config.repoPath)
      );
    }

    if (success.value) {
      await appendStep(lines, success, "pnpm -r build", () =>
        runCommandCapture(pnpmProgram(), ["-r", "build"], config.repoPath)
      );
    }

    let restartRequired = true;
    if (success.value) {
      const pm2Capture = await runCommandCapture(
        "pm2",
        ["reload", path.join(config.repoPath, "ecosystem.config.cjs"), "--update-env"],
        config.repoPath
      );
      lines.push("$ pm2 reload ecosystem.config.cjs --update-env");
      if (pm2Capture.output) {
        lines.push(pm2Capture.output);
      }
      lines.push("");
      if (pm2Capture.success) {
        restartRequired = false;
      } else {
        lines.push("pm2 不可用或 reload 失败，请手动重启服务。");
        lines.push("");
      }
    }

    const refreshed = await readGitState(config.repoPath, false).catch(() => undefined);
    const version = readPackageVersion(config.repoPath);
    const output = lines.join("\n").trim();
    const upstream = git.upstreamRef ?? `origin/${git.branch}`;

    setDeployState({
      status: success.value ? "succeeded" : "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      branch,
      error: success.value ? undefined : "更新失败，请查看命令输出。"
    });

    return {
      success: success.value,
      message: success.value
        ? restartRequired
          ? `已从远程拉取更新并完成构建（${upstream}）。请重启服务使后端生效。`
          : `已从远程拉取更新并完成构建（${upstream}），服务已通过 pm2 重载。`
        : "更新失败，请查看下方命令输出。",
      output,
      version,
      gitCommit: refreshed?.commit ?? git.commit,
      restartRequired: success.value && restartRequired
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setDeployState({
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      branch,
      error: message
    });
    return {
      success: false,
      message: "更新失败，请查看下方命令输出。",
      output: message,
      version: readPackageVersion(config.repoPath),
      restartRequired: false
    };
  } finally {
    updateInProgress = false;
  }
};
