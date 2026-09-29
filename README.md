# Doctor Hog: Bug Rescue

An unofficial PostHog-themed arcade game. Open `index.html` in a browser or serve this directory with any static web server. No account or install is needed. The arena fills the available browser width with a floating HUD and a compact bottom strip showing the GMI assets and live code snippet. It adapts its canvas width and bug lanes to wide screens. Open the Patient chart for the live bug list; use `behind-the-scenes.html` for the full GMI artwork, music, and design concept. The original Doctor Hog art is used throughout the playable game.

Bugs fall through Doctor Hog's office toward the protected code. Move Doctor Hog left and right to catch them before they reach the terminal. Three missed bugs crash the ward. Defend three increasingly quick waves to save the code.

- Desktop: Left/Right or A/D; drag or click in the game area to move toward that position. Press P or Escape to pause.
- Display: The game fills the browser window. Use the **Full screen** button to hide browser chrome when supported.
- Touch: Drag in the game area or hold the on-screen left/right buttons.
- Music: A GMI-generated lo-fi jazz track starts when the shift begins. It was prompted to have no vocals or spoken words. Use the Music button to turn it off or on. It pauses with the game.

The Doctor Hog character uses the original artwork supplied for this project; `doctor-hog.png` is preserved unchanged. GMI Cloud MCP generated four game assets plus the full-page visual concept used to design the responsive front end:

| Asset | File | Model and settings | Quoted list price |
| --- | --- | --- | ---: |
| Doctor's office | `office-gmi.png` | GPT Image 2.5 Sunburst, 1536×864, medium | $0.00957 |
| Falling bug | `bug-gmi.png` | GPT Image 2.5 Sunburst, 1024×1024 transparent, medium | $0.01396 |
| Protected code terminal | `code-terminal-gmi.png` | GPT Image 2.5 Sunburst, 1536×1024 transparent, medium | $0.01122 |
| Lo-fi jazz soundtrack | `lofi-jazz-gmi.mp3` | Minimax Music 3.0, 44.1 kHz stereo MP3, 81.7 seconds | $0.15 |
| Front-end visual concept | `ui-concept-gmi.png` | GPT Image 2.5 Sunburst, 1536×1024, medium | $0.011645 |

Total quoted list price for the active assets and design concept: **$0.196395**. GMI MCP produced the concept image; the responsive HTML, CSS, and game logic were implemented from that design. The concept image contains a different draft hedgehog, but it is not displayed in the finished game. Every in-game Doctor Hog image uses the original `doctor-hog.png` artwork. The earlier elevator track is preserved at `elevator-gmi.mp3`; its separate generation was also quoted at $0.15. The charged amounts can differ if the organization has a discount. An earlier unused GMI patient illustration is preserved at `concepts/patient-gmi.png`.

The code examples are educational. The game does not send events to PostHog or call GMI while playing. This fan project is not affiliated with PostHog.
