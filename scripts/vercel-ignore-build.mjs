import { spawnSync } from "node:child_process";

const RUNTIME_PATHS = [
  "src",
  "public",
  "scripts/vercel-ignore-build.mjs",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "vercel.json",
];

function gitExitCode(args) {
  const result = spawnSync("git", args, { stdio: "ignore" });
  return result.status ?? 2;
}

function continueBuild(reason) {
  console.log(`Vercel ignore build: ${reason}; continuing build.`);
  process.exit(1);
}

const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim();
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();

if (!previousSha || !commitSha) {
  continueBuild("missing comparison SHA");
}

for (const sha of [previousSha, commitSha]) {
  if (gitExitCode(["rev-parse", "--verify", "--quiet", `${sha}^{commit}`]) !== 0) {
    continueBuild(`unresolvable comparison SHA ${sha}`);
  }
}

const diffExitCode = gitExitCode([
  "diff",
  "--quiet",
  previousSha,
  commitSha,
  "--",
  ...RUNTIME_PATHS,
]);

if (diffExitCode === 0) {
  console.log("Vercel ignore build: no hosted-runtime changes; ignoring build.");
  process.exit(0);
}

continueBuild(diffExitCode === 1 ? "hosted-runtime changes detected" : "git comparison failed");
