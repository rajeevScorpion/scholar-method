# Example 02: fact-guard catches a number and a citation

`after.md` is a deliberately bad editorial pass over `before.md`: 42% became 24%, and the citation (Narang and Bose, 2019)
was dropped. Everything else is the same. The guard does not judge which version is right; it makes the change visible so
the edit can be rejected or separately evidenced.

```text
LOST    numbers: 42%
ADDED   numbers: 24%
ALTERED numbers: 42%  ->  24%  (possible)
LOST    citations: Narang and Bose 2019
3 protected change(s). Reject or justify each one.
```
