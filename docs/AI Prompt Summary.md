# SlackLine · AI prompt summary

I used OpenAI Codex to help plan and develop SlackLine. The earlier entries paraphrase my prompts in chronological order. The most recent chat is grouped by theme and records each prompt separately. The starting materials were the project notes, the technical requirements, and an existing interactive HTML prototype.

| Order | What I asked or clarified                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Read the project documents and use the existing prototype as the visual reference. It already looked close to the finished product. Ask me about anything unclear, then write an implementation plan.                                                                                                                                                                                            |
| 2     | Make place suggestions available worldwide while keeping the feature lightweight.                                                                                                                                                                                                                                                                                                                |
| 3     | Showing the distance while dragging the yarn is enough, so a long distance should still allow a stop. I agreed with the proposed rule that travel legs start at zero days and users can assign whole travel days from the trip budget. I also clarified that a one-destination trip should begin with a loop of yarn hanging from that destination, which the user can pull toward other places. |
| 4     | Explain which map API the app would use.                                                                                                                                                                                                                                                                                                                                                         |
| 5     | Confirm whether the plan includes a menu showing all saved trips. Explain where trip data is stored and whether the app would run locally for now.                                                                                                                                                                                                                                               |
| 6     | Make sure the finished project eventually meets every technical requirement.                                                                                                                                                                                                                                                                                                                     |
| 7     | Start development based on the agreed plan.                                                                                                                                                                                                                                                                                                                                                      |
| 8     | Change the opening screen to the menu of previously planned trips. Improve the city picker because it offered too few choices, and address the awkward GeoNames link.                                                                                                                                                                                                                            |
| 9     | Explain how to stop the running app.                                                                                                                                                                                                                                                                                                                                                             |
| 10    | Stop the local SlackLine server and give me the command to start it again.                                                                                                                                                                                                                                                                                                                       |
| 11    | Summarize my prompts in a file in the project's docs folder so I can disclose the AI assistance in my submission.                                                                                                                                                                                                                                                                                |

## Codex's contribution

Codex drafted the implementation plan and acceptance checklist, wrote application code, and ran build and data checks. Codex proposed browser local storage for saved trips, chose the default map tile provider, and implemented the city-picker feedback by adding 44 initial destinations and moving the provider link into a credits section. My request to meet every requirement was a project goal. At the time of this summary, the full browser acceptance checklist still awaited verification.


AI prompt No.2
Here are the instructions you gave me in this conversation, in order:

1. **Start the project.** You asked how to open it, then asked me to start it for you. I ran `npm run dev`.
2. **Front-end improvements (two things).**
   - The map was too plain and grey, so you couldn't tell sea, roads, lakes, cities, or wilderness apart. You wanted it more realistic and lively, maybe even animated.
   - Add a small stick handle on each ball, like in the HTML prototype, so users can adjust days easily. You also asked me to say whether either change would affect latency, because of the Technical Requirement.
3. **Do option A first, then see the result, and add the handle.** A was switching to a colorful basemap.
4. **Continue with option B, and discuss how to adjust the day budget.** B was recoloring with the brand palette. You wanted a faster way to change the trip length than one day at a time, and asked for options before I changed anything. You later decided to skip it and focus on the front end.
5. **Check latency.** You asked whether A and B add latency and had me test it. You then asked what option C (terrain shading) would look like and cost, and had me test that too.
6. **Ask which version this is.** You asked whether we were on "C". I explained that A, B, and C were cumulative options, not separate versions.
7. **Ask what D means.** D was building outlines. You said "ok" and I looked at how they currently render.
8. **Do option E.** Add motion effects (sea shimmer and cloud shadows).
9. **Motion was hard to see.** I made the effects more visible, and you said it looked good.
10. **Ask what code changed.** I listed the two modified files.
11. **Check the Technical Requirement.** You asked what "response speed" means there, whether the current version meets it, what to change to meet everything, and finally asked me to run the tests.
12. **Upload to GitHub and write a summary.** You said the issues were minor and asked me to upload, then asked for a teammate summary in Chinese, then English, then two sentences. I committed and pushed to `main` (`1dd3a41`).

## Map interaction and place suggestions

1. Make the map interaction as smooth and responsive as `slackline-prototype.html`. Keep the yarn line and balls steady when moving around the map, and make the yarn balls smaller when zoomed out far enough to see an entire continent.
2. Show city and suggestion dots earlier, at wider zoom levels. The yarn already stays aligned with the map much better, but make panning and zooming even smoother and reduce any remaining lag.
3. Show each city dot as soon as its city name appears on the map.
4. Restore yellow dots for whole cities. Clicking a city dot should show fetched photos and backpacker notes, and dragging the yarn onto it should attach the route to that city. Use green dots for specific attractions and natural sites, which users should be able to add as one-stay or multi-stay stops.

## Route postcards and notes

5. Fix the number input in a travel leg's postcard. It behaves incorrectly when I click the leg's note and try to enter how long an overnight journey takes.
6. Use stays instead of days as the general planning unit. Rename the travel leg's **Travel days** field to describe nights spent in transit, such as a night on an overnight train. Make note popups draggable and resizable so users can move them to the edge of the map or enlarge the writing area to see more of their notes.
7. Remove the move-icon buttons shown on the note cards since clicking them doesn't do anything. Make links in note text clickable.

## Trip length and stay allocation

8. Keep trip length in days and show separately how many stays are available to spend. Make new stop dots start at their zero-stay size.
9. Change the default size and allocation for a new stop to one stay while keeping zero-stay stops possible.

## Saved trips and navigation

10. Make the SlackLine logo on the map clickable and take users to My Trips.
11. Replace the Delete text with a gray trash basket icon. Let users reorder saved trips by dragging them within the My Trips list. Use riffle signifier.
