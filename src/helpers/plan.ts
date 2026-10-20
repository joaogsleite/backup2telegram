/**
 * Turn upload inputs into a concrete plan: which local files to send,
 * packing folders (and oversized single files) into 7z volumes first.
 * No Telegram calls here - pure local planning, testable in isolation.
 */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  cleanupPacked,
  packToVolumes,
  type PackedArchive,
} from "./pack.js";

export interface PlannedFile {
  path: string;
  caption?: string;
}

export interface PlanOptions {
  /** Volume size label for 7z -v, e.g. "2000m". */
  volumeSize: string;
  /** Same size in bytes - files larger than this get packed. */
  volumeBytes: number;
  /** 7z compression level 0-9. */
  level: number;
  /** Parent dir for temp archives. Defaults to ./tmp in this repo. */
  workDir?: string;
  /** Base caption for packed volumes. */
  caption?: string;
  /** When true, only describe the plan without packing anything. */
  dryRun: boolean;
}

export interface UploadPlan {
  items: PlannedFile[];
  packed: PackedArchive[];
  volumeBytes: number;
}

export async function planUploads(
  inputs: string[],
  opts: PlanOptions,
): Promise<UploadPlan> {
  const items: PlannedFile[] = [];
  const packed: PackedArchive[] = [];
  try {
    for (const input of inputs) {
      if (!existsSync(input)) {
        throw new Error(`No such file or directory: ${input}`);
      }
      const st = statSync(input);
      const needsPack = st.isDirectory() || st.size > opts.volumeBytes;
      if (!needsPack) {
        items.push({ path: resolve(input), caption: opts.caption });
        continue;
      }
      if (opts.dryRun) {
        items.push({ path: `(packed from ${input})`, caption: opts.caption });
        continue;
      }
      const archive = await packToVolumes(input, {
        volumeSize: opts.volumeSize,
        level: opts.level,
        workDir: opts.workDir,
      });
      packed.push(archive);
      const base = archive.baseName.replace(/\.7z$/, "");
      archive.volumes.forEach((volume, i) => {
        const captionBase = opts.caption ?? base;
        items.push({
          path: volume,
          caption:
            archive.volumes.length > 1
              ? `${captionBase} (part ${i + 1} of ${archive.volumes.length})`
              : captionBase,
        });
      });
    }
  } catch (err) {
    cleanupPlan(packed, false);
    throw err;
  }
  return { items, packed, volumeBytes: opts.volumeBytes };
}

/** Delete temp archives, unless the user asked to keep them. */
export function cleanupPlan(packed: PackedArchive[], keep: boolean): void {
  for (const archive of packed) {
    if (keep) {
      console.log(`  kept archive volumes in ${archive.dir}`);
      continue;
    }
    try {
      cleanupPacked(archive);
    } catch {
      // ignore cleanup errors
    }
  }
}
