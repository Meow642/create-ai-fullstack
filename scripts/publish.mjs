import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { log } from "node:console";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const rawArgs = process.argv.slice(2);

let dryRunOnly = false;
const publishArgs = [];

for (const arg of rawArgs) {
  if (arg === "--dry-run") {
    dryRunOnly = true;
    continue;
  }

  publishArgs.push(arg);
}

if (publishArgs.includes("--tag") || publishArgs.some((arg) => arg.startsWith("--tag="))) {
  throw new Error("Do not pass --tag manually. The publish tag is derived from package.json version.");
}

if (packageJson.private === true) {
  throw new Error("Refusing to publish because package.json has private: true.");
}

const tag = getPublishTag(packageJson.version);
const checks = ["lint", "test", "typecheck", "verify"];
const publishEnv = {
  ...process.env,
  npm_config_cache: process.env.npm_config_cache ?? join(tmpdir(), `${packageJson.name}-npm-cache`),
};

log(`Publishing ${packageJson.name}@${packageJson.version} with npm dist-tag "${tag}".`);

for (const script of checks) {
  await run("pnpm", [script]);
}

await run("pnpm", ["publish", "--dry-run", "--tag", tag, ...publishArgs], { env: publishEnv });

if (dryRunOnly) {
  log("Dry run completed. Skipping real publish.");
} else {
  await run("pnpm", ["publish", "--tag", tag, ...publishArgs], { env: publishEnv });
}

function getPublishTag(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);

  if (!match) {
    throw new Error(`Unsupported package version "${version}". Expected semver.`);
  }

  const prerelease = match[4];

  if (!prerelease) {
    return "latest";
  }

  const channel = prerelease.split(".")[0];

  if (channel === "alpha" || channel === "beta") {
    return channel;
  }

  throw new Error(
    `Unsupported prerelease channel "${channel}" in version "${version}". Expected alpha or beta.`,
  );
}

function run(command, args, options = {}) {
  log(`\n> ${command} ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? `exit code ${code}`}.`));
    });
  });
}
