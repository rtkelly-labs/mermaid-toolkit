# Repository governance

The merge policy is: **PRs only, linear history, and a green `PR checks` gate**,
with **auto-merge** so a PR merges itself once CI is green.

These are GitHub *server* settings, not repo files, so a repo admin applies them
once. The workflow side (`ci.yml`) is already in the repo.

## Apply it

Run the self-contained, idempotent script (needs `gh`, authenticated as an admin):

```bash
./scripts/setup-repo-governance.sh                # rtkelly-labs/mermaid-toolkit
./scripts/setup-repo-governance.sh owner/repo     # or another repo
```

It enables auto-merge + squash/rebase-only merges + branch auto-delete, then
creates (or updates) the `main` branch ruleset. The ruleset JSON is inlined in
the script, so it is the single source of truth — re-run it any time to reset
the policy.

## What gets enforced

| Requirement            | How                                                            |
| ---------------------- | ------------------------------------------------------------- |
| Linear history         | Ruleset `required_linear_history` + squash/rebase-only merges |
| PRs required           | Ruleset `pull_request` rule (0 approvals — solo-friendly)     |
| CI must pass           | Ruleset `required_status_checks` → **`PR checks`** context    |
| Branch up to date      | `strict_required_status_checks_policy: true`                  |
| Auto-merge available   | Repo setting `allow_auto_merge`                               |
| Tidy branches          | `delete_branch_on_merge`                                      |

`PR checks` is a single aggregation job (see `ci.yml`) that depends on the
lint/test/build matrix, the consumer usage check, and benchmarks. Requiring that
one context means adding or dropping a Node version never needs a rule edit.

The script keeps an admin bypass on the ruleset so you can't lock yourself out;
remove the `bypass_actors` entry in the script for strict enforcement.

## Using auto-merge

```bash
gh pr merge <number> --squash --auto
```

The PR then merges automatically the moment `PR checks` is green and the branch
is up to date.
