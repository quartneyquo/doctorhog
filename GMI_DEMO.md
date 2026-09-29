# GMI Cloud MCP demo notes

Refresh the full-window game at http://127.0.0.1:8765/. The bottom strip shows the GMI-generated game assets and live code snippet. Use the **Behind the scenes** link (http://127.0.0.1:8765/behind-the-scenes.html) for the full asset and design story. The **Patient chart** button opens the live bug list during the game.

| In-game use | Local file | Model | Generation request ID | Quoted list price |
| --- | --- | --- | --- | ---: |
| Doctor's office background | `office-gmi.png` | GPT Image 2.5 Sunburst | `ae6ef311-03ed-49b5-9bc3-8bfd5b473a6a` | $0.00957 |
| Falling bug sprite | `bug-gmi.png` | GPT Image 2.5 Sunburst | `ed4ef6e0-0c34-442f-9175-a9cd355254ec` | $0.01396 |
| Protected code terminal | `code-terminal-gmi.png` | GPT Image 2.5 Sunburst | `4400ada5-ad7a-4d2d-9036-79bf0f7b6849` | $0.01122 |
| Lo-fi jazz game music, current | `lofi-jazz-gmi.mp3` | Minimax Music 3.0 | `cb84bf98-84d4-48d5-a779-efb50e920b27` | $0.15 |
| Full-page front-end visual concept | `ui-concept-gmi.png` | GPT Image 2.5 Sunburst | `653840d0-8819-454d-8633-618eae25ef6b` | $0.011645 |
| Elevator-style music, replaced | `elevator-gmi.mp3` | Minimax Music 3.0 | `2b58393d-e30b-44aa-b975-95cf0c4bf09d` | $0.15 |

**Active game assets plus design concept: $0.196395 quoted list price.** Including the replaced elevator track, these six generations were quoted at $0.346395 total. The actual charged amount may differ if the organization has a discount. GMI MCP generated the visual concept; Codex translated it into responsive HTML/CSS and retained the interactive canvas game.

The demo used these MCP tools:

1. `search_models` to find image and music models.
2. `get_model` to inspect accepted settings and availability.
3. `search_docs` to check the music model's lyric and style input.
4. `estimate_generation` to quote each approved asset.
5. `submit_generation` to start six approved jobs.
6. `get_generation` to retrieve asynchronous results.
7. `list_generations` to verify completed image and audio jobs.

The game plays local copies of the completed assets. It does not call GMI while playing. The original Doctor Hog art remains the player sprite.
