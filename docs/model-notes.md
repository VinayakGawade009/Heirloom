# Model notes

## Setup
Laptop: RTX 4050 6 GB, 16 GB RAM. Default model: gemma4:e2b (4.6 GB per ollama list). Also pulled: gemma4:e4b (6.6 GB). Ollama 0.40.13, num_ctx 4096, temperature 0.

## Problems found and fixed
- First load failed with a memory error while the e4b download was running. It worked once the download was paused.
- Raw "ollama run" with a full-size phone photo crashed. The engine resizes to 1280 px on the longest side, which fits in 6 GB.
- The Marathi page made the model loop on rows of digits. Fixed with num_predict, repeat_penalty and a trimming step.
- Extract returned about 60 junk facts on a digit-heavy page. Fixed with filtering, overlap removal and a stricter prompt.

## Test pages (Oct 30), warm runs
| Page | Type | Transcribe | Total (transcribe + translate + extract) | Wrong words | VRAM |
| --- | --- | --- | --- | --- | --- |
| page2 | Neat English | 7.5 to 8.3 s | 20 to 22 s | 2 | about 3.2 GB (100% GPU) |
| page4 | Catalan | 11 to 15 s | 32 to 41 s | 14 | about 3.2 GB (100% GPU) |
| page5 | Marathi | 15 to 43 s | 36 to 72 s | to count | about 3.2 GB (100% GPU) |

## Findings
- Reads neat English well. Catalan and Marathi come out partly wrong.
- Never marked an unsure word: "uncertain" was empty on every page, even after prompt tuning.
- One misread word spreads into the translation (roja gave "redhead", rosa gave "rose").
- Facts work well on a sentence with names, places and dates. On pages without them the list is empty or nearly empty after the stricter prompt (a few ordinary nouns still slip through on some Marathi and Catalan runs).
- Back-to-back runs on the same English and Catalan pages gave identical text. The Marathi page varied between runs (rows of digits appeared in some runs and not others), so its wrong-word count depends on the run.
- ollama_not_running and model_not_installed both return clear one-line errors through the try command.
- gemma4:e2b uses about 3.2 GB of the 6 GB card, 100% GPU. The first page after a restart is slower (about 20 s extra) while the model loads.
- The pages tested may be printed or typed rather than handwritten. Real handwritten pages from the team still need testing.

## Verdict
GO with limits. Default model: gemma4:e2b. Comparing gemma4:e4b on Saturday.
