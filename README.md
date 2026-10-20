# backup2telegram

Back up files and folders to a Telegram group, channel, or chat from the
command line. Folders (and single files over the volume size) are compressed
into 7z archives, split into Telegram-sized volumes, and uploaded. Files
already on Telegram can be listed and downloaded back.

Built on [teleproto](https://docs.teleproto.dev) (MTProto - the protocol
Telegram's own apps speak), so it works with user accounts, not just bots.

## Prerequisites

- Node.js via nvm. The repo pins the version in `.nvmrc` (v24):
  `nvm use` (run `nvm install` first if that version is missing).
- A Telegram app identity (`TG_API_ID` / `TG_API_HASH`) from
  [my.telegram.org](https://my.telegram.org) → API development tools.
- Either a user session (recommended for private backups) or a bot token
  (the bot must be added to the group with permission to post).

No global installs: `tsx` is a local dependency, and every script runs
through it via `npm run <cmd>` or directly as `./src/index.ts …`
(shebang: `#!/usr/bin/env -S npx --no-install tsx`).

## Setup (fresh clone)

```sh
nvm use
npm install
cp .env.example .env
# fill in TG_API_ID and TG_API_HASH in .env
```

Then authenticate **once**, pick one:

```sh
# Option A - user account (can post anywhere you can)
npm run login
# answer phone → code → 2FA, then save the printed string as TG_SESSION in .env

# Option B - bot (simpler, must be added to the group first)
# put the @BotFather token in .env as TG_BOT_TOKEN=
```

Find the upload target:

```sh
npm run chats
# -4461471195 (group) My Backups
# @some_public_channel (channel) ...
```

Use the marked id as `<target>` (`-4461471195` for basic groups,
`-100…` for supergroups/channels, `@username` for public ones, `me` for
Saved Messages). Save it as `TG_TARGET` in `.env` and you can omit
`<target>` from then on.

## Usage

All commands also work as `./src/index.ts <command> …` directly.

```sh
# upload files and/or folders (folders are packed into 7z, split if needed)
npm run upload -- <target> <path...> [options]
npm run upload -- ./backup.tar.gz                    # target from .env
npm run upload -- -4674583959 ~/Photos/2026-07/ --level 7
npm run upload -- -4674583959 ./huge-file.iso
npm run upload -- ~/Backups/2026-07/ --dry-run        # show the plan, do nothing

# list files posted in a chat (message ids are used for downloading)
npm run files -- [target] [--limit 50]

# download a file by message id (target defaults to .env)
npm run download -- 486 /tmp/restore/
npm run download -- -4674583959 486 ./restored.tar.gz

# list chats with their upload-ready ids
npm run chats [--limit 100]
```

Upload options:

| Flag | Default | Meaning |
|---|---|---|
| `--caption <text>` | archive/file name | Caption per file; split archives get `<caption> (part i/N)` |
| `--workers <n>` | `4` | Parallel upload chunks (1-16) |
| `--level <n>` | `5` | 7z compression level 0-9 (`0` = store only) |
| `--volume-size <size>` | `2000m` | Max bytes per archive volume (`500k`, `2g`, …). Must fit Telegram's per-file cap |
| `--work-dir <dir>` | os tmpdir | Where temporary `.7z` volumes are built |
| `--keep-archive` | off | Keep the temporary volumes instead of deleting them |
| `--dry-run` | off | Print what would be packed/uploaded, do nothing |
| `--force-document` / `--no-force-document` | force | Send as generic file vs rendered media |
| `--silent` | off | Send without notification sound |

## Restoring

Each upload of a folder (or oversized file) is a standard multi-volume
7z archive: `name.7z.001`, `name.7z.002`, …

1. Download all parts of an archive into one folder (Telegram app, Telegram
   Web, or `npm run download` per message id from `npm run files`).
2. Double-click `.7z.001` with 7-Zip installed (or `7z x name.7z.001`).
   Volumes know about each other - no rejoin step, no terminal needed.

## Telegram limits worth knowing

- Max file size is 2 GB per file (4 GB with Premium) - hence the `2000m`
  default volume size. Anything bigger must be split, which packing does
  automatically.
- A bare number like `4674583959` resolves as a *user*; groups/channels
  need the marked form (`-4674583959`, `-100…`). `npm run chats` prints
  the right form.

## How it works (development guide)

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
    media.ts               # extract filename/size from Telegram documents
    format.ts / progress.ts# human sizes, durations, progress-bar rendering
```

Key mechanics:

- **Packing**: `7zip-bin` ships a real `7za` binary for every platform
  (no system 7-Zip needed to *create* archives). `pack.ts` spawns it
  directly with `node:child_process` (`-mx`, `-v`, `-bb0 -bsp1` for
  progress) - no wrapper dependency. Temp archives live under
  `os.tmpdir()` (or `--work-dir`) and are deleted unless `--keep-archive`.
- **Uploads**: `client.sendFile()` streams each file with a progress bar.
  Bare numbers are users; groups/channels need marked ids (see above).
- **Error model**: `args.ts` parses and validates (invalid input prints
  usage and exits 1); `command.ts` throws on runtime failures and the
  `index.ts` entrypoint maps those to exit code 1. Parsing never touches
  the network - `--dry-run` proves it.

Useful scripts:

```sh
npm run typecheck   # tsc --noEmit, run before committing anything
```

Verifying without spamming your group: `--dry-run` exercises planning end
to end; packing can be tested locally with a tiny volume size
(`--volume-size 1m` on a fixture dir), then extract `.001` with the system
`7z` and `diff -r` against the source. `chats`/`files` are read-only and
safe to run live.

Adding a command: create `src/commands/<name>/{index,args,usage,command}.ts`
following an existing one, wire it into the dispatch in `src/index.ts`,
and add an npm script (`"name": "tsx ./src/index.ts name"`).
