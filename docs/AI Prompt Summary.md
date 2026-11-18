# SlackLine · AI prompt summary

I used OpenAI Codex to help plan and develop SlackLine. The following entries paraphrase my prompts in chronological order. The starting materials were the project notes, the technical requirements, and an existing interactive HTML prototype.

| Order | What I asked or clarified |
| --- | --- |
| 1 | Read the project documents and use the existing prototype as the visual reference. It already looked close to the finished product. Ask me about anything unclear, then write an implementation plan. |
| 2 | Make place suggestions available worldwide while keeping the feature lightweight. |
| 3 | Showing the distance while dragging the yarn is enough, so a long distance should still allow a stop. I agreed with the proposed rule that travel legs start at zero days and users can assign whole travel days from the trip budget. I also clarified that a one-destination trip should begin with a loop of yarn hanging from that destination, which the user can pull toward other places. |
| 4 | Explain which map API the app would use. |
| 5 | Confirm whether the plan includes a menu showing all saved trips. Explain where trip data is stored and whether the app would run locally for now. |
| 6 | Make sure the finished project eventually meets every technical requirement. |
| 7 | Start development based on the agreed plan. |
| 8 | Change the opening screen to the menu of previously planned trips. Improve the city picker because it offered too few choices, and address the awkward GeoNames link. |
| 9 | Explain how to stop the running app. |
| 10 | Stop the local SlackLine server and give me the command to start it again. |
| 11 | Summarize my prompts in a file in the project's docs folder so I can disclose the AI assistance in my submission. |

## Codex's contribution

Codex drafted the implementation plan and acceptance checklist, wrote application code, and ran build and data checks. Codex proposed browser local storage for saved trips, chose the default map tile provider, and implemented the city-picker feedback by adding 44 initial destinations and moving the provider link into a credits section. My request to meet every requirement was a project goal. At the time of this summary, the full browser acceptance checklist still awaited verification.
