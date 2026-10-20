/**
 * Argument parsing and validation for the upload command.
 * Invalid input exits here with a usage hint; command.ts only sees valid args.
 */
import { existsSync } from "node:fs";
import {
  hasHelp,
  optInt,
  optString,
  tokenize,
  unknownOption,
} from "../../helpers/cli.js";
import { getEnvTarget } from "../../helpers/env.js";
import { parseVolumeSize } from "../../helpers/pack.js";
import { printUploadUsage } from "./usage.js";

export type Args = {
  target?: string;
  files: string[];
  caption?: string;
  workers: number;
  forceDocument: boolean;
  silent: boolean;
  help: boolean;
  level: number;
  volumeSize: string;
  workDir?: string;
  keepArchive: boolean;
  dryRun: boolean;
};

const KNOWN_OPTS = [
  "caption",
  "workers",
  "force-document",
  "no-force-document",
  "silent",
  "help",
  "h",
  "level",
  "volume-size",
  "work-dir",
  "keep-archive",
  "dry-run",
] as const;

export function parseArgs(argv: string[]): Args {
  const t = tokenize(argv);
  const unknown = unknownOption(t, KNOWN_OPTS);
  if (unknown) {
    console.error(`Unknown option: ${unknown}\n`);
    printUploadUsage();
    process.exit(1);
  }
  const args: Args = {
    files: [],
    workers: optInt(t, "workers") ?? 4,
    forceDocument: !t.opts.has("no-force-document"),
    silent: t.opts.has("silent"),
    help: hasHelp(t),
    level: optInt(t, "level") ?? 5,
    volumeSize: optString(t, "volume-size") ?? "2000m",
    workDir: optString(t, "work-dir"),
    keepArchive: t.opts.has("keep-archive"),
    dryRun: t.opts.has("dry-run"),
  };
  args.caption = optString(t, "caption");

  const envTarget = getEnvTarget();
  if (args.help) return args;
  const { positionals } = t;
  if (positionals.length === 0) {
    if (envTarget) {
      console.error("Missing <file...>\n");
      printUploadUsage();
      process.exit(1);
    }
    return args; // -> "Missing upload target." in validation below
  }
  // With a default target configured, leading local paths are files, not
  // the target: `upload ./dir ./file` uses TG_TARGET/TG_GROUP_ID.
  // An explicit target still wins: `upload @group ./file`.
  if (envTarget && existsSync(positionals[0])) {
    args.target = envTarget;
    args.files = positionals;
  } else if (positionals.length >= 2) {
    args.target = positionals[0];
    args.files = positionals.slice(1);
  } else if (envTarget) {
    args.target = envTarget;
    args.files = positionals;
  } else {
    console.error("Missing <target> and <file...>\n");
    printUploadUsage();
    process.exit(1);
  }
  return args;
}

/**
 * Validate parsed args. Exits on invalid input.
 * Returns the volume size in bytes for command.ts to use.
 */
export function assertValidArgs(args: Args): number {
  if (!Number.isInteger(args.workers) || args.workers < 1 || args.workers > 16) {
    console.error("--workers must be an integer between 1 and 16");
    process.exit(1);
  }
  if (!Number.isInteger(args.level) || args.level < 0 || args.level > 9) {
    console.error("--level must be an integer between 0 and 9");
    process.exit(1);
  }
  let volumeBytes: number;
  try {
    volumeBytes = parseVolumeSize(args.volumeSize).bytes;
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  if (!args.target) {
    console.error("Missing upload target.");
    printUploadUsage();
    process.exit(1);
  }
  return volumeBytes;
}
