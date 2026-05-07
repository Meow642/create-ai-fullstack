#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_BUMP="${1:-patch}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before bumping a release." >&2
  exit 1
fi

echo "Bumping npm package version: $VERSION_BUMP"
pnpm version "$VERSION_BUMP"

echo "Pushing $BRANCH and version tags to $REMOTE"
git push "$REMOTE" "$BRANCH" --follow-tags
