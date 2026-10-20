# AGENTS.md - backup2telegram

CLI tool that backs files/folders up to a Telegram group via MTProto
(`teleproto`), with 7z pack-and-split for anything over the volume size.
Read `README.md` first for user-facing usage; this file is for agents
working on the repo (using the tool AND developing it).

## Environment

- Node is managed with nvm. The repo pins the version in `.nvmrc`.
  Prefix every shell command with:
  `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use`
- `npm install` only. No global installs: `tsx`, `tsc` live in
  `./node_modules/.bin/`. Entry point runs via
  `#!/usr/bin/env -S npx --no-install tsx` (strictly local, never fetches).
- `npm install-scripts` warnings about blocked postinstalls (esbuild,
  fsevents) are expected in sandboxed environments; `tsx`/`tsc` still work.
- TypeScript `module/moduleResolution: NodeNext`, `type: module`.
  Relative imports MUST use the `.js` extension (`./env.js`), even though
  the source files are `.ts`.
- Before finishing any code change: `./node_modules/.bin/tsc --noEmit`
  (aka `npm run typecheck`). It must pass.

## Secrets - hard rules

- `.env` contains REAL credentials (`TG_API_ID`, `TG_API_HASH`,
  `TG_SESSION`, possibly `TG_BOT_TOKEN`). NEVER print it, `cat` it, or
  paste values into logs, code, or chat. Verify keys with key-only greps,
  e.g. `grep -o "^[A-Za-z_][A-Za-z0-9_]*" .env | sort` (prints names only).
- Treat `TG_SESSION` / `TG_BOT_TOKEN` like passwords. Never log auth
  material; the codebase already avoids it - keep it that way.
- Never commit `.env` (`.gitignore` covers it). `.env.example` holds only
  placeholders.

## Using the tool (it hits a real Telegram account)

- Read-only and safe: `--help`, `upload --dry-run`, `chats`, `files`.
- Side-effecting (only run when the user explicitly asks): `upload`
  (posts to the real group), `download` (reads + writes local files),
  `login` (interactive, prints a new session string).
- Prefer `npm run <cmd> -- …` over raw `./src/index.ts …` (same thing,
  less path typing). Remember `--` before user args with npm.
- Targets: `@username`, `me`, invite links, or **marked** numeric ids
  (`-4674583959` basic group, `-100…` supergroup/channel). Use
  `npm run chats` to resolve a name to its id - never guess.
- Default target comes from `.env` (`TG_TARGET`, fallbacks `TG_GROUP`,
  `TG_CHAT`). An explicit `<target>` arg always wins.
- For local pack testing without Telegram traffic: build a small fixture
  in `$TMPDIR`, pack with `--volume-size 1m`, extract `.001` with the
  system `7z`, `diff -r` against the source, then delete fixtures.
  Never test `upload` against the real group unprompted.

## Codebase map

```
src/
  index.ts                 # entrypoint: loads .env, dispatches subcommands
  commands/<name>/
    index.ts               # thin entrypoint: parse → help → validate → execute
    args.ts                # Args type, parseArgs, asserts (exit on bad input)
    usage.ts               # usage text only
    command.ts             # the actual work (only place with side effects)
  helpers/
    cli.ts                 # shared argv tokenizer (--k v, --k=v, flags, -h)
    env.ts                 # .env loading, credential/target getters
    telegram.ts            # teleproto client factory (logs silenced to errors)
    pack.ts                # 7z pack/split via bundled 7za binary
    plan.ts                # inputs → pack-or-direct plan + temp-dir cleanup
    media.ts               # filename/size extraction from Telegram documents
    format.ts / progress.ts# human sizes, durations, progress-bar rendering
```

## Conventions

- One job per file (see map). `index.ts` stays ~15-30 lines; parsing in
  `args.ts`; work in `command.ts`; text in `usage.ts`.
- Error model: `args.ts` parses and validates - invalid input prints usage
  and `process.exit(1)`. `command.ts` throws on runtime failures; the
  command `index.ts` catches and sets `process.exitCode = 1`.
- New CLI parsing MUST go through `helpers/cli.ts:tokenize` (handles
  `--key=value`, `--`, `-h`, and negative-number positionals). Each command
  declares its own `KNOWN_OPTS` and rejects the rest via `unknownOption`.
- All commands share `getEnvTarget()` for default-target resolution.
  Credential checks share `requireAuth()` in `helpers/env.ts`.
- Temp archives: `planUploads` owns its temp dirs and cleans partial work
  on failure (`cleanupPlan`); the caller cleans on success unless
  `--keep-archive`.
- CJS deps without bundled types get a local `declare module` shim
  (precedent: the removed `node-7z.d.ts`). Prefer deps that ship types.

## Gotchas learned the hard way

- **Bare numeric ids resolve as users.** `4674583959` → `PeerUser` error.
  Groups need `-4674583959`, channels `-100…`. Always resolve via `chats`.
- **Empty env vars shadow fallbacks.** Use `||`, never `??`, when chaining
  env vars - an empty `TG_TARGET=` in `.env` once hid `TG_GROUP_ID`.
- **7za has no wrapper.** `node-7z` was removed: its `@3` ignores
  `$spawnOptions`, and a thin `spawn` + `-bsp1` progress parsing (~40
  lines in `pack.ts`) replaced it. If re-adding a wrapper, verify every
  option is actually wired through.
- **npm strips the bundled 7za exec bit.** `ensureSevenZip()` in
  `pack.ts` runs `chmod 0o755` at runtime - do not remove it.
- **Progress callback shapes differ.** `sendFile` calls back with a single
  fraction `0..1`; `downloadMedia` calls back with
  `(downloaded: BigInteger, total: BigInteger)`. `createProgressBar`
  accepts both - check `define.d.ts` before assuming.
- **teleproto logs its banner in the constructor**, so `setLogLevel`
  after construction is too late. `createClient` passes a pre-leveled
  `baseLogger` instead - keep it.
- **IDs are `big-integer` objects**, not numbers/bigints. `.toString()`
  for display; never `typeof x === "bigint"` checks.
- **`--help` must short-circuit before missing-arg checks**, otherwise a
  configured env target turns bare `--help` into a "missing file" error.
- **Negative-id targets are positionals.** The tokenizer treats `-123`
  as a value; each command's positional logic must not mistake it for a
  flag (see upload/download target resolution with env fallback).
- **Split 7z naming:** single volume → `name.7z`; split → `name.7z.001…`
  (no bare file). `packToVolumes` handles both; don't assume one form.
- **Volume cap:** 7z `-v` size must fit Telegram's per-file limit
  (2 GB, 4 GB with Premium). `parseVolumeSize` enforces a 4 GB ceiling.

## Verification checklist (in order)

1. `npm run typecheck` - must pass, always.
2. `--help` and invalid-arg paths for touched commands (no network).
3. `upload --dry-run` for planning changes (resolves env target, no pack,
   no connect).
4. Local pack round-trip on fixtures (`1m` volumes → system `7z x`
   `.001` → `diff -r`) for `pack.ts`/`plan.ts` changes.
5. Live `chats`/`files` (read-only) when entity handling changes.
6. Real `upload`/`download` only when the user explicitly asks.
