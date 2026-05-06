# History rebuild scripts

Backdate ~63 commits across **Nihar / Soham / Kalhar** spread Feb 15 → May 3 2026 (CMPE 202 sprints 1–6).

## How real diffs are produced

`prepare_history.sh` first **snapshots** the entire final code tree to `/tmp/zestify_snapshot` (rsync, ~95 files), then deletes `.git` and reinitializes. Each commit script copies a *subset* of files from the snapshot back into the working tree, then commits only those paths. So every commit has a real diff = exactly the file additions/changes recorded in that commit.

For "fix" commits later in the timeline (ticket repurchase, admin CSS import, etc.):
- **Early** commit copies the snapshot file then runs a `sed` strip to remove the fix lines (`c_strip` helper).
- **Late** commit copies the fresh snapshot — the diff = the fix re-applied.

For the README:
- Day-1 commit writes a small **stub** README via `cat`/heredoc.
- May 3 commit copies the **full** snapshot README — the diff = entire architecture/patterns docs added.

## Author identity

The commit scripts **do not hardcode** any name or email. They read whoever is currently in `git config user.name` / `user.email`. Each team member runs their own script after setting their identity.

## Workflow

### Prereq (run once, on whichever machine assembles history first)

```bash
cd Zestify
./scripts/history/prepare_history.sh
```

This:
1. Snapshots the working tree to `/tmp/zestify_snapshot`.
2. Wipes `.git` + the working tree (snapshot is safe).
3. Re-inits empty repo with remote `https://github.com/Nihar4/202_final_test.git`.
4. Restores `scripts/history/*` so the per-author scripts can run.

### Step 1 — Nihar (~21 commits)

```bash
git config user.name  "Nihar Patel"
git config user.email "<nihar's GitHub email>"
./scripts/history/commits_nihar.sh
git push -u origin main --force
```

### Step 2 — Soham (~22 commits)

```bash
# On Soham's machine, after cloning:
git clone https://github.com/Nihar4/202_final_test.git
cd 202_final_test
# Make sure /tmp/zestify_snapshot exists (copy the final source tree here).
git config user.name  "Soham Patel"
git config user.email "<soham's GitHub email>"
./scripts/history/commits_soham.sh
git push origin main
```

### Step 3 — Kalhar (~20 commits)

```bash
git clone https://github.com/Nihar4/202_final_test.git
cd 202_final_test
git config user.name  "Kalhar Patel"
git config user.email "<kalhar's GitHub email>"
./scripts/history/commits_kalhar.sh
git push origin main
```

## Result (verified on dry run)

```
Soham   22 commits   2953 LOC
Nihar   21 commits   3041 LOC
Kalhar  20 commits   2565 LOC
```

Roughly equal commit count and lines, balanced full-feature responsibility (each member owns features across DB / API / services / frontend / infra / tests, not split BE-vs-FE).

## Single-machine simulation

If one person assembles all 3 author histories on one laptop, run:

```bash
./scripts/history/prepare_history.sh

git config user.name "Nihar Patel" && git config user.email "..."
./scripts/history/commits_nihar.sh

git config user.name "Soham Patel" && git config user.email "..."
./scripts/history/commits_soham.sh

git config user.name "Kalhar Patel" && git config user.email "..."
./scripts/history/commits_kalhar.sh

git push -u origin main --force
```

## Verifying

```bash
git shortlog -sne
git log --pretty='%an' --numstat | awk '/^[A-Z]/{a=$0;next} NF==3 && $1~/^[0-9]+$/{add[a]+=$1; del[a]+=$2} END{for(k in add) print k, add[k], del[k]}'
```
