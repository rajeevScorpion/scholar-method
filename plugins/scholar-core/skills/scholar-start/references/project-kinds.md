# Project kinds: taking it ahead once the scholar has confirmed

Detector kinds (`node $SCHOLAR detect`): thesis, journal-paper, conference-paper, article, review, book, proposal,
other. The scholar confirms, corrects or defines the kind first; nothing is written before. Record it with
`init --apply --kind <kind>` (`paper` is accepted for `journal-paper`; `other` takes `--describe "..."`).
Ask at most the three questions in the row, defaults first. The writing profile and the integrity rules are the same
for every kind. A project that yields several outputs (a thesis and papers from it) gets one project map per output;
`related_projects` is filled only if the scholar opts in.

| Kind | Ask next (max 3) | Map | Set up | Gates that matter |
|---|---|---|---|---|
| thesis | University format rules and where they live; who must approve what (supervisor, committee); stage | Chapter map, accepted proposal as authority, registers | Status, handoff, decisions; chapter files stay the scholar's | Supervisor approvals, accepted proposal outranks drafts, no invented findings |
| journal-paper | Target journal and its author guidelines; word limit and citation style; overlap with the scholar's other work | Manuscript, venue rules, reviewer-response flow | Venue decision with its source in decisions | Venue rules outrank project defaults; overlap check; reviewer responses are the author's words |
| conference-paper | Venue template; page limit and deadline; anonymisation needed (default yes if double-blind) | Paper file, template, camera-ready checklist | Deadline in status; template path in the map | Page limit, anonymisation, camera-ready requirements |
| article | Audience and outlet; word count; how sources are credited | Draft, pitch or brief, source list | Light records; same integrity rules | Citation expectations are lighter, claims still need sources |
| review | Protocol and where it is; databases searched; inclusion and exclusion criteria | Protocol, search log, screening log | Screening log; PRISMA flow as a Mermaid diagram, counts only from the log | Protocol changes recorded in decisions; no study counted that the log does not show |
| book | Chapter plan; publisher style; permissions for figures | Chapter plan, publisher style sheet, permissions list | Permissions register beside the asset register | Permissions before figures go in; one chapter's claims do not leak into another unchecked |
| proposal | Funder criteria; aims; whether a budget is in scope (default no) | Call text, aims, review criteria | Funder criteria as the authority in decisions | Eligibility and page rules; budget only if asked |
| other | The scholar's own description, in their words | Whatever the scholar names | Minimal `scholar/` folder, description stored as `project.description` | Integrity rules unchanged |

Defaults for a new (near-empty) project: ask the kind directly with the options above plus "Something else, I will
describe it", then the row's questions, then create only what the scholar wants.
