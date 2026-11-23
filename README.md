# csv-reader-speed-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Pasletik/csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Pasletik/csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast drop-in for make.fun's csv-reader 1.0.0: `solve.js` exports `run(input)`, which reads a broken CSV text (`{text, header}`) and answers `{columns, rows, errors}` exactly as the reference reader does — stray CRs dropped, doubled quotes unescaped, junk after a closing quote appended, an unterminated quote read again as unquoted, ragged rows padded or cut to the first record's width, every broken thing recorded as an error. Where the reference builds each field a character at a time, this reader scans with `charCodeAt` and cuts clean runs out of the text with `slice`, joining segments only when a field actually holds something broken. `main.ts` is the harness driver: it reads `/input/cases.json`, answers each case with `run`, and writes `/output/answers.json`.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=fdvwjd8e&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
