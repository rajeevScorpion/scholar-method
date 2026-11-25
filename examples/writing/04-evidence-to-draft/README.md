# 04 evidence to draft (synthetic)

How `draft` produced `draft.md` from `scholar/claims`:

| Sentence | Claim | Status | What the draft did |
|---|---|---|---|
| 1 | CLM-0001 | claim-checked | Stated and cited with a page locator. |
| 2 | CLM-0001 challenged by bose2021 | claim-checked | The contradicting source is acknowledged, not hidden. |
| 3 | CLM-0002 | unverified | No prose and no citation: a visible `[GAP: ...]` marker. |

The paragraph carries `<!-- claims: CLM-0001, CLM-0002 -->` so the checkers can find its claims. Run from this folder
(`$CITE` is `check-citations.mjs`, `$PREFLIGHT` is `preflight.mjs`):

```
node $CITE --root . draft.md        # passes: every key resolves, locators present, the GAP covers CLM-0002
node $PREFLIGHT --root . draft.md   # warns about the GAP marker; with --submission it is an error
```
