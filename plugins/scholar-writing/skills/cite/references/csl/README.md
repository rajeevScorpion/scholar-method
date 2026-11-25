# Bundled CSL style

`apa.csl` is **APA Style 7th edition** from the official Citation Style Language repository
(https://github.com/citation-style-language/styles), copied unmodified at commit
`f123868a546e6e7cec10e808ae04ef0e52bf2210` (2026-11-24).

Licence: Creative Commons Attribution-ShareAlike 3.0 (stated in the file's `<rights>` element; authors Brenton M. Wiernik and
Andrew Dunning, contributor Jay Pfaffman). The licence covers this file only; the rest of Scholar Method stays MIT (see
`NOTICE.md`). If you change `apa.csl`, share the change under the same licence.

No other style is bundled. `node scripts/style.mjs fetch <style> --apply` downloads one on demand from the same
repository at the same pinned commit, only after the scholar has said yes. See `../styles.md`.
