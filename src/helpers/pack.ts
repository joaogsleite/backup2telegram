/**
 * Pack folders (or oversized single files) into 7z archives, split into
 * Telegram-sized volumes using the 7za binary bundled with `7zip-bin`.
 * No system-wide 7-Zip installation required. 7za is driven directly via
 * node:child_process - no wrapper dependency.
 */
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { path7za } from "7zip-bin";
import { formatBytes } from "./format.js";
import { createProgressBar } from "./progress.js";

export interface PackOptions {
  /** Volume size for 7z -v, e.g. "2000m". */
  volumeSize: string;
  /** Compression level 0-9, mapped to -mx. */
  level: number;
  /** Parent directory for temp archives. Defaults to os.tmpdir(). */
  workDir?: string;
}

export interface PackedArchive {
  /** Temp dir holding the volumes. Delete with cleanup() unless kept. */
  dir: string;
  /** Archive base name, e.g. "Backups-Pai.7z". */
  baseName: string;
  /** Absolute volume paths in upload order. */
  volumes: string[];
}

/** Resolve the bundled 7za binary, restoring its exec bit if npm stripped it. */
export function ensureSevenZip(): string {
  const bin: string = path7za;
  if (!bin || !existsSync(bin)) {
    throw new Error(
      "Bundled 7-Zip binary not found. Reinstall with `npm install 7zip-bin`.",
    );
  }
  try {
    chmodSync(bin, 0o755);
  } catch {
    // Best effort (e.g. Windows); spawn will surface real problems.
  }
  return bin;
}

export function parseVolumeSize(spec: string): { label: string; bytes: number } {
  const m = /^(\d+(?:\.\d+)?)\s*([bkmg])?$/i.exec(spec.trim());
  if (!m) {
    throw new Error(
      `Invalid --volume-size: ${spec}. Use e.g. 2000m, 500k, 2g, or bytes.`,
    );
  }
  const multipliers: Record<string, number> = {
    b: 1,
    k: 1024,
    m: 1024 * 1024,
    g: 1024 * 1024 * 1024,
  };
  const unit = (m[2] ?? "b").toLowerCase();
  const bytes = Math.floor(Number(m[1]) * multipliers[unit]);
  if (!Number.isFinite(bytes) || bytes < 1024 * 1024) {
    throw new Error(`Invalid --volume-size: ${spec}. Minimum is 1m.`);
  }
  if (bytes > 4 * 1024 * 1024 * 1024) {
    throw new Error(
      `Invalid --volume-size: ${spec}. Telegram accepts at most 4 GB per file (2 GB without Premium).`,
    );
  }
  return { label: `${m[1]}${unit}`, bytes };
}

/** Recursive byte size of a file or directory (stats only, no content reads). */
export function sourceByteSize(path: string): number {
  const st = statSync(path);
  if (!st.isDirectory()) return st.size;
  let total = 0;
  for (const entry of readdirSync(path)) {
    total += sourceByteSize(join(path, entry));
  }
  return total;
}

function dirHasFiles(dir: string): boolean {
  for (const entry of readdirSync(dir)) {
    const st = statSync(join(dir, entry));
    if (st.isFile()) return true;
    if (st.isDirectory() && dirHasFiles(join(dir, entry))) return true;
  }
  return false;
}

function runSevenAdd(
  bin: string,
  archive: string,
  sourceAbs: string,
  level: number,
  volumeLabel: string,
  totalBytes: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Compressing ${basename(sourceAbs)}...`);
    const bar = createProgressBar("...", totalBytes);
    // Absolute paths: 7z stores entries rooted at the source basename.
    // -bb0 keeps the log quiet, -bsp1 streams " 12%" progress to stdout.
    const child = spawn(
      bin,
      ["a", archive, sourceAbs, "-y", `-mx=${level}`, `-v${volumeLabel}`, "-bb0", "-bsp1"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.stdout.on("data", (chunk: Buffer) => {
      const matches = chunk.toString().match(/(\d+)%/g);
      if (!matches) return;
      const last = matches[matches.length - 1].replace("%", "");
      bar.update(Number(last) / 100);
    });
    child.on("error", (err) => {
      bar.finish();
      reject(err);
    });
    child.on("close", (code) => {
      bar.finish();
      if (code === 0) {
        resolve();
        return;
      }
      const detail = stderr.trim().split("\n").pop() || `7z exited with code ${code}`;
      reject(new Error(`7z failed: ${detail}`));
    });
  });
}

export async function packToVolumes(
  srcPath: string,
  opts: PackOptions,
): Promise<PackedArchive> {
  const bin = ensureSevenZip();
  const abs = resolve(srcPath);
  if (!existsSync(abs)) {
    throw new Error(`No such file or directory: ${srcPath}`);
  }
  const st = statSync(abs);
  if (st.isDirectory() && !dirHasFiles(abs)) {
    throw new Error(`Directory is empty: ${srcPath}`);
  }
  if (!st.isDirectory() && !st.isFile()) {
    throw new Error(`Not a file or directory: ${srcPath}`);
  }

  const name = basename(abs);
  const dir = mkdtempSync(join(resolve(opts.workDir ?? tmpdir()), "backup2telegram-"));
  const archive = join(dir, `${name}.7z`);
  const totalBytes = sourceByteSize(abs);

  // Run with absolute paths; the archive is rooted at the folder/file name.
  await runSevenAdd(bin, archive, abs, opts.level, opts.volumeSize, totalBytes);

  // 7z writes `name.7z` when everything fits, else `name.7z.001`, `.002`, ...
  let volumes: string[];
  if (existsSync(archive) && statSync(archive).isFile()) {
    volumes = [archive];
  } else {
    volumes = readdirSync(dir)
      .filter((f) => f.startsWith(`${name}.7z.`))
      .sort()
      .map((f) => join(dir, f));
  }
  if (volumes.length === 0) {
    throw new Error(`7-Zip produced no output for: ${srcPath}`);
  }
  console.log(
    `  packed ${formatBytes(totalBytes)} into ${volumes.length} volume(s)`,
  );
  return { dir, baseName: `${name}.7z`, volumes };
}

export function cleanupPacked(packed: PackedArchive): void {
  rmSync(packed.dir, { recursive: true, force: true });
}
