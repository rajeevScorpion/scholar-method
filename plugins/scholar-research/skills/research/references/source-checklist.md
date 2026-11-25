# Source checklist (metadata verification)

Run this before moving a source from `abstract-only` to `metadata-checked`. Record what failed in `limitations`.
A source that fails stays a lead. Do the checks on the actual page or file, never from memory.

| # | Check | How | If it fails |
|---|---|---|---|
| 1 | DOI present and resolves | Open `https://doi.org/<doi>`; it must land on the same item. Copy the DOI from the page, never type it from memory. | No DOI is fine for older, grey or book material: leave `doi` empty and use a stable `url`. A DOI that lands elsewhere is a wrong DOI: clear it. |
| 2 | Author, year, title match | Compare the landing page, the PDF first page and the record. Same authors in the same order, same year, same title (allow punctuation). | Fix the record from the page. If pages disagree (preprint versus published), note both and say which one you read. |
| 3 | Retraction or correction | Search the title with "retraction" or "correction"; check the publisher page banner and a retraction database if available. | Retracted: do not use as support; keep the record, set a limitation, tell the scholar. Corrected: read the correction. |
| 4 | Primary or secondary | Does it report original data or an original artefact (primary), or discuss other work (secondary)? | Label it in `type` or notes. A secondary account of a primary item is not evidence of the item. |
| 5 | Version | Preprint, accepted manuscript or version of record? Note which. | Cite the version you read; prefer the version of record when the claim is specific. |
| 6 | Peer review and venue | Is the venue what it claims to be? Is it a thesis, report, blog or book chapter? | Say so in `type` and `limitations`. Do not call a blog an article. |
| 7 | Access and rights | Open access, licence, institutional access, embargo. | Record in `rights`. Do not copy or share a file you may not. |
| 8 | Language and translation | Original language? Translation read? | Note it; page numbers in a translation are not those of the original. |
| 9 | Locators | For any statement you rely on, note page, figure or section in the version you read. | No locator, no verified claim. Leave the claim `metadata-checked` at most. |
| 10 | Provenance | Search string, database, date, how you reached it. | Add to the notes. |

## Read status after the checklist
- Checks 1 to 3 and 5 pass, abstract read: `metadata-checked`.
- Relevant sections read in the text, locators noted: `full-text-reviewed`.
- Anything else: `lead` or `abstract-only`.

`full-text-reviewed` means the relevant part was read, not that the whole source is endorsed. Claim verification
is a separate step (skill `evidence`): a source can be fully reviewed and still not support a given sentence.
