import { spawn } from "node:child_process";

export type CommandCapture = {
  success: boolean;
  output: string;
};

export const runCommandCapture = (
  command: string,
  args: string[],
  cwd: string
): Promise<CommandCapture> =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd });
    let output = "";

    child.stdout?.on("data", (chunk: Buffer | string) => {
      output += chunk.toString();
    });

    child.stderr?.on("data", (chunk: Buffer | string) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({
        success: false,
        output: [output.trim(), error.message].filter(Boolean).join("\n")
      });
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        output: output.trim()
      });
    });
  });

export const pnpmProgram = () => (process.platform === "win32" ? "pnpm.cmd" : "pnpm");
