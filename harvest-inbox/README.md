# Harvest inbox

Proposals from scholars who ran `harvest` in their own projects arrive here, for the maintainer to review.

Each file is one proposal (`HRV-<date>-<slug>.md`) or one bundle. It is a suggestion, not a change: nothing in it has
been applied. Contributors reach this folder in three ways:

- a `harvest/<id>` branch made by `harvest.mjs promote` in a local checkout, then pushed to a fork and opened as a
  pull request;
- a bundle file attached to an issue or a pull request;
- a maintainer copying a proposal in by hand.

## For the maintainer
1. Read the proposal. It was privacy-scanned and approved by its scholar, but read it as a stranger would: no names,
   paths, titles, unpublished text or data. If anything private slipped through, delete it and tell the contributor.
2. Decide: apply, adjust or decline. Apply with the `forge` skill, in the right pack, to the repo's skill standards.
3. Delete the inbox file in the commit that applies it (or declines it, with a one-line reason in the commit message).

Bundles hold several proposals between `<!-- harvest-proposal: <id> -->` and `<!-- end-proposal: <id> -->` lines.
Split them into one file per proposal if that helps review.

Never commit real research content here. This folder should be empty between reviews.
