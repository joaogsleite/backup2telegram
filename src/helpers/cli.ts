/**
 * Shared CLI argument parsing for all commands.
 *
 * Understands `--key value`, `--key=value`, boolean `--flags`, short `-h`,
 * negative numbers (e.g. chat id `-4674583959`) as positional values, and
 * `--` as an end-of-options marker. Anything else starting with `-` is left
 * in place for each command to reject as an unknown option.
 */

export interface CliArgs {
  positionals: string[];
  opts: Map<string, string | true>;
}

const NEGATIVE_NUMBER = /^-\d/;

export function tokenize(argv: string[]): CliArgs {
  const positionals: string[] = [];
  const opts = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--") && a.length > 2) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        opts.set(a.slice(2, eq), a.slice(eq + 1));
      } else {
        const key = a.slice(2);
        const next = argv[i + 1];
        if (
          next !== undefined &&
          (!next.startsWith("-") || NEGATIVE_NUMBER.test(next))
        ) {
          opts.set(key, next);
          i++;
        } else {
          opts.set(key, true);
        }
      }
    } else if (/^-[a-zA-Z]$/.test(a)) {
      opts.set(a[1], true);
    } else {
      // Includes negative numbers like -4674583959, which are values.
      positionals.push(a);
    }
  }
  return { positionals, opts };
}

export function hasHelp(t: CliArgs): boolean {
  return t.opts.has("help") || t.opts.has("h");
}

export function optString(t: CliArgs, key: string): string | undefined {
  const v = t.opts.get(key);
  return typeof v === "string" ? v : undefined;
}

export function optInt(t: CliArgs, key: string): number | undefined {
  const v = optString(t, key);
  if (v === undefined) return undefined;
  return Number(v);
}

/** First option not in `known`, rendered back in CLI form, if any. */
export function unknownOption(
  t: CliArgs,
  known: readonly string[],
): string | undefined {
  for (const key of t.opts.keys()) {
    if (!known.includes(key)) return key.length === 1 ? `-${key}` : `--${key}`;
  }
  return undefined;
}
