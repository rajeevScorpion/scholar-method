# Example 01: before, after, checks

Plainly synthetic. The editorial pass changed wording only. The numbers (18%, 214, 12), the citation (Narang and Bose, 2019)
and the uncertainty ("seasonal change may account for part of the difference") are the same. The pass was done by hand
under the Indian-English profile. Humanizer was not used, and nothing here was run to evade AI detection.

## Unified diff

```diff
--- a/before.md
+++ b/after.md
@@ -7,2 +7,2 @@ note: "Plainly synthetic example. The source, the survey and every number are in
 
-In today's rapidly evolving landscape of public libraries — a pivotal setting for reading, study, and community life — this robust study delves into extended evening hours and their transformative effect on borrowing. Earlier work reported that evening hours dramatically raised borrowing by 18% (Narang and Bose, 2019). Our survey of 214 members across 12 branches revolutionises that picture: borrowing was higher in the branches that stayed open late, although seasonal change may account for part of the difference. It is important to note that libraries shouldn't underestimate this potential. In conclusion, extended hours unlock the full potential of community reading.
+Public libraries are places where people read, study and meet, and many have extended their evening hours. Earlier work reported that evening hours raised borrowing by 18% (Narang and Bose, 2019). Our survey of 214 members across 12 branches points the same way: borrowing was higher in the branches that stayed open late, although seasonal change may account for part of the difference. Libraries considering longer evening hours should not underestimate their potential, nor the chance that part of the gain is seasonal.
```

## Lint before (the 7 advisory lines are generic AI register: the scholar decides)

```text
before.md:8:29 ai-register [advisory] generic AI register "landscape": keep only if it carries meaning | today's rapidly evolving landscape of public libraries — a
before.md:8:59 em-dash [error] em dash: rewrite with a comma, colon, brackets or a new sentence | cape of public libraries — a pivotal setting for re
before.md:8:63 ai-register [advisory] generic AI register "pivotal": keep only if it carries meaning | of public libraries — a pivotal setting for reading, stu
before.md:8:97 oxford-comma [likely] likely Oxford comma before "and": remove it unless it prevents ambiguity | etting for reading, study, and community life — thi
before.md:8:118 em-dash [error] em dash: rewrite with a comma, colon, brackets or a new sentence | tudy, and community life — this robust study delves
before.md:8:125 ai-register [advisory] generic AI register "robust": keep only if it carries meaning | nd community life — this robust study delves into extend
before.md:8:138 ai-register [advisory] generic AI register "delves": keep only if it carries meaning | life — this robust study delves into extended evening ho
before.md:8:183 ai-register [advisory] generic AI register "transformative": keep only if it carries meaning | evening hours and their transformative effect on borrowing. Ear
before.md:8:521 ai-register [advisory] generic AI register "It is important to note": keep only if it carries meaning | part of the difference. It is important to note that libraries shouldn't
before.md:8:560 contraction [error] contraction "shouldn't": write it out in formal prose | t to note that libraries shouldn't underestimate this poten
before.md:8:600 ai-register [advisory] generic AI register "In conclusion": keep only if it carries meaning | estimate this potential. In conclusion, extended hours unlock t
1 file(s): 4 finding(s), 7 advisory.
```

## Lint after

```text
1 file(s): 0 finding(s), 0 advisory.
```

## Fact guard (before vs after)

```text
No protected changes.
```
