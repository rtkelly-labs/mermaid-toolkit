#!/usr/bin/env bash
#
# One-shot, idempotent setup of the repo's merge governance:
#   - PR-only, linear history, squash/rebase-only merges
#   - required "PR checks" status context (strict / branch up to date)
#   - auto-merge enabled, head branches auto-deleted
#
# Self-contained: the ruleset JSON is inlined below, so this script is the only
# thing you need. Safe to re-run — it updates the existing "main" ruleset in
# place rather than creating duplicates.
#
# Requires: gh (authenticated as an admin of the repo). Usage:
#   ./setup-repo-governance.sh                      # defaults to rtkelly-labs/mermaid-toolkit
#   ./setup-repo-governance.sh owner/repo           # or target another repo
set -euo pipefail

REPO="${1:-rtkelly-labs/mermaid-toolkit}"
RULESET_NAME="main"

echo "==> Repo merge settings ($REPO)"
gh api -X PATCH "repos/$REPO" \
  -F allow_auto_merge=true \
  -F allow_squash_merge=true \
  -F allow_rebase_merge=true \
  -F allow_merge_commit=false \
  -F delete_branch_on_merge=true >/dev/null
echo "    auto-merge on; squash/rebase only; branches auto-deleted"

# Inlined branch ruleset. Targets the default branch. Admin role (actor_id 5)
# keeps an "always" bypass so you can't lock yourself out — delete that entry
# from bypass_actors for strict enforcement.
RULESET=$(cat <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash", "rebase"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [{ "context": "PR checks" }]
      }
    }
  ],
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ]
}
JSON
)

echo "==> Branch ruleset '$RULESET_NAME'"
existing_id="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name==\"$RULESET_NAME\") | .id" 2>/dev/null | head -n1 || true)"

if [ -n "$existing_id" ]; then
  printf '%s' "$RULESET" | gh api -X PUT "repos/$REPO/rulesets/$existing_id" --input - >/dev/null
  echo "    updated existing ruleset (id $existing_id)"
else
  printf '%s' "$RULESET" | gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null
  echo "    created ruleset"
fi

echo "==> Done. Enable auto-merge on a PR with:  gh pr merge <number> --squash --auto"
