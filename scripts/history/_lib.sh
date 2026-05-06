#!/usr/bin/env bash
# Shared helpers for per-author commit replay scripts.
# Sourced by commits_nihar.sh / commits_soham.sh / commits_kalhar.sh.

set -eo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SNAPSHOT="${SNAPSHOT_DIR:-/tmp/zestify_snapshot}"

ensure_snapshot() {
    if [ ! -d "$SNAPSHOT" ]; then
        echo "ERROR: snapshot dir $SNAPSHOT not found." >&2
        echo "Run scripts/history/prepare_history.sh first." >&2
        exit 1
    fi
}

ensure_git_identity() {
    local name email
    name=$(git -C "$REPO" config user.name  2>/dev/null || true)
    email=$(git -C "$REPO" config user.email 2>/dev/null || true)
    if [ -z "$name" ] || [ -z "$email" ]; then
        echo "ERROR: set git config user.name and user.email before running." >&2
        echo "  git config user.name  \"Your Name\"" >&2
        echo "  git config user.email \"you@example.com\"" >&2
        exit 1
    fi
    echo "==> Committing as: $name <$email>"
}

do_commit_paths() {
    # Stage only listed paths, then commit.
    local datetime="$1"; shift
    local msg="$1"; shift
    local paths=("$@")
    if [ "${#paths[@]}" -gt 0 ]; then
        ( cd "$REPO" && git add -- "${paths[@]}" )
    fi
    if git -C "$REPO" diff --cached --quiet; then
        echo "  skip empty: $msg"
        return 0
    fi
    GIT_AUTHOR_DATE="$datetime" GIT_COMMITTER_DATE="$datetime" \
        git -C "$REPO" commit -m "$msg" --quiet
    printf "  %s  %s\n" "${datetime:0:10}" "$msg"
}

# c DATE MSG FILES...   — copy each file/dir from snapshot to repo, commit only those paths
c() {
    local datetime="$1" msg="$2"; shift 2
    local paths=()
    for f in "$@"; do
        local src="$SNAPSHOT/$f" dst="$REPO/$f"
        if [ -f "$src" ]; then
            mkdir -p "$(dirname "$dst")"
            cp "$src" "$dst"
            paths+=("$f")
        elif [ -d "$src" ]; then
            mkdir -p "$dst"
            rsync -a "$src/" "$dst/"
            paths+=("$f")
        else
            echo "  warn: missing $f"
        fi
    done
    if [ "${#paths[@]}" -eq 0 ]; then
        echo "  skip (no files matched): $msg"
        return 0
    fi
    do_commit_paths "$datetime" "$msg" "${paths[@]}"
}

# c_strip DATE MSG FILE SED_EXPR — copy file from snapshot, apply sed (creates earlier "buggy" version), commit
c_strip() {
    local datetime="$1" msg="$2" file="$3" sed_expr="$4"
    mkdir -p "$(dirname "$REPO/$file")"
    cp "$SNAPSHOT/$file" "$REPO/$file"
    sed -i.bak "$sed_expr" "$REPO/$file"
    rm -f "$REPO/$file.bak"
    do_commit_paths "$datetime" "$msg" "$file"
}

# c_inline DATE MSG FILE  (with stdin) — write literal stdin content to file, commit
c_inline() {
    local datetime="$1" msg="$2" file="$3"
    mkdir -p "$(dirname "$REPO/$file")"
    cat > "$REPO/$file"
    do_commit_paths "$datetime" "$msg" "$file"
}

# c_append DATE MSG FILE  (with stdin) — append stdin content to existing file, commit
c_append() {
    local datetime="$1" msg="$2" file="$3"
    mkdir -p "$(dirname "$REPO/$file")"
    cat >> "$REPO/$file"
    do_commit_paths "$datetime" "$msg" "$file"
}

# Chronological orchestrator helpers — set author identity per commit via env vars.
# This keeps topology matching date order so GitHub displays commits sorted globally.

set_author() {
    case "$1" in
        nihar)  export GIT_AUTHOR_NAME="Nihar Patel"     GIT_AUTHOR_EMAIL="niharpatel4444@gmail.com" ;;
        soham)  export GIT_AUTHOR_NAME="Soham Raj Jain"  GIT_AUTHOR_EMAIL="sohamrajjain0007@gmail.com" ;;
        kalhar) export GIT_AUTHOR_NAME="kalhar108"       GIT_AUTHOR_EMAIL="kalharpatel10@gmail.com" ;;
        *) echo "unknown author $1" >&2; return 1 ;;
    esac
    export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
}

# c_as AUTHOR DATE MSG FILES...
c_as()        { set_author "$1"; shift; c        "$@"; }
c_inline_as() { set_author "$1"; shift; c_inline "$@"; }
c_strip_as()  { set_author "$1"; shift; c_strip  "$@"; }
c_append_as() { set_author "$1"; shift; c_append "$@"; }
