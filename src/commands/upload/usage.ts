/**
 * Usage text for the upload command.
 */
export function printUploadUsage(): void {
  console.log(`Usage:
  ./src/index.ts upload <target> <path...> [options]
  npx tsx ./src/index.ts upload <target> <path...> [options]

Arguments:
  <target>              @username, numeric id, invite link, phone, or "me"
  <path...>             one or more files or folders to upload.
                        Folders are packed into a 7z archive (split into
                        volumes if needed). Single files over --volume-size
                        are packed too; smaller files are sent directly.

Options:
  --caption <text>      caption applied to each file (packed volumes get
                        "<caption> (part i/N)" when split)
  --workers <n>         parallel upload chunks (default 4, 1-16)
  --level <n>           7z compression level 0-9 (default 5, 0 = store only)
  --volume-size <size>  max bytes per archive volume, e.g. 2000m, 500k, 2g
                        (default 2000m; must fit Telegram's per-file cap)
  --work-dir <dir>      parent dir for temporary archives (default: os tmpdir)
  --keep-archive        keep the temporary .7z volumes instead of deleting them
  --dry-run             show what would be packed/uploaded without doing it
  --force-document      send as generic file, skip photo/video detection (default)
  --no-force-document   let Telegram render photos/videos as media
  --silent              send without notification sound
  -h, --help            show this help

Env:
  TG_API_ID, TG_API_HASH, TG_SESSION (or TG_STRING_SESSION), TG_BOT_TOKEN, TG_TARGET

Examples:
  ./src/index.ts upload @mygroup ./backup.tar.gz
  ./src/index.ts upload -4674583959 ~/Photos/2026-07/ --level 7
  ./src/index.ts upload -4674583959 ./huge-file.iso --volume-size 2000m
  TG_TARGET=-4674583959 ./src/index.ts upload ./a.zip --dry-run`);
}
