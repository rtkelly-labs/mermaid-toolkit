#!/usr/bin/env bash
# Apply .github/labels.yml to a repo immediately, from your machine.
#
# The Labels workflow does this automatically on push to main, but this script
# exists for the same reason setup-repo-governance.sh does: sometimes you want
# the server state fixed *now*, without waiting on a merge.
#
# Idempotent — creates missing labels, updates colour/description on existing
# ones. Unlike the workflow it does NOT delete labels absent from the file;
# pass --prune if you want that.
#
# Usage:
#   ./scripts/sync-labels.sh                     # rtkelly13/mermaid-toolkit
#   ./scripts/sync-labels.sh owner/repo          # another repo
#   ./scripts/sync-labels.sh --prune             # also delete unlisted labels
#
# Requires: gh (authenticated), and yq for YAML parsing.
set -euo pipefail

PRUNE=false
REPO="rtkelly13/mermaid-toolkit"

for arg in "$@"; do
  case "$arg" in
    --prune) PRUNE=true ;;
    -h | --help)
      sed -n '2,20p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) REPO="$arg" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABELS_FILE="$SCRIPT_DIR/../.github/labels.yml"

for cmd in gh yq; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "error: '$cmd' is required but not installed." >&2
    exit 1
  }
done

[ -f "$LABELS_FILE" ] || {
  echo "error: $LABELS_FILE not found." >&2
  exit 1
}

echo "Syncing labels from .github/labels.yml → $REPO"
echo

declare -a desired=()

count=$(yq 'length' "$LABELS_FILE")
for i in $(seq 0 $((count - 1))); do
  name=$(yq -r ".[$i].name" "$LABELS_FILE")
  color=$(yq -r ".[$i].color" "$LABELS_FILE")
  description=$(yq -r ".[$i].description // \"\"" "$LABELS_FILE")

  desired+=("$name")

  # `--force` makes create act as upsert, so this is safe to re-run.
  if gh label create "$name" \
    --repo "$REPO" \
    --color "$color" \
    --description "$description" \
    --force >/dev/null 2>&1; then
    printf '  ✓ %s\n' "$name"
  else
    printf '  ✗ %s (failed)\n' "$name"
  fi
done

if [ "$PRUNE" = true ]; then
  echo
  echo "Pruning labels not present in labels.yml:"
  while IFS= read -r existing; do
    [ -n "$existing" ] || continue
    found=false
    for want in "${desired[@]}"; do
      [ "$existing" = "$want" ] && found=true && break
    done
    if [ "$found" = false ]; then
      gh label delete "$existing" --repo "$REPO" --yes >/dev/null 2>&1 &&
        printf '  - deleted %s\n' "$existing"
    fi
  done < <(gh label list --repo "$REPO" --limit 200 --json name -q '.[].name')
fi

echo
echo "Done. ${#desired[@]} labels defined."
