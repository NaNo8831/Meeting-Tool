# /update — Pull the latest 120x method into this folder

Bring this project folder up to date with the latest 120x method, and repair
anything missing — without touching your own work (your plan, decisions, and
code are left exactly as they are).

Do this now:

1. From the project root — the folder that holds `.120x/method-manifest.json` —
   run:

   ```bash
   node scripts/update-method.js
   ```

   It reads this folder's mode + version from `.120x/method-manifest.json`,
   fetches the current method files from the 120x app, refreshes only the shared
   method files that changed, and (for an existing-project folder) adds any
   missing pieces in place — the Architect starter prompt and status tracking.
   It only ever writes the shared method files plus those two repair files; it
   never deletes or overwrites your own files, and nothing is uploaded.

2. Read the summary the script prints and relay it to the person in plain
   English: whether the folder was already up to date, or how many method files
   were refreshed and whether the starter prompt / status tracking were added.
   If it reports an error, relay that instead.

That's the whole job — run the script and report what changed. Do not edit method
files by hand.
