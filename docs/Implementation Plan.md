# SlackLine implementation plan

Build a desktop-first React and TypeScript trip planner using [the interactive prototype](slackline-prototype.html) as the visual reference. Preserve its ticket, typography, icons, yarn texture, postcards, cat reactions, and budget feedback. The planner opens on My trips on every launch and refresh. From there, users can reopen any saved trip or select New trip.

## 1. Establish the app and visual baseline

Set up React and TypeScript. Deliver the course's Hello World opening screen as the first milestone, then retain it and the Hello Styles screen on a demo route once My trips becomes the app entry point. Port the prototype's SVG assets and style tokens, including the five specified colors, Fraunces and Figtree weights, and custom icons. Move the ticket, header, budget display, and help controls into components. Preserve both trip modes and the editable trip duration.

**Demo check.** Open both course screens, then create a 22-day trip from the ticket. Compare the ticket and planner controls side by side with the HTML reference at the same viewport size.

## 2. Implement the trip model and budget

Store ordered stops with stable IDs, coordinates, names, stay days, and notes. Store travel days and notes on individual legs. Include trip mode, total days, start date, and display preference. Each new stop costs one day and each new leg starts at zero. Compute remaining days as total days minus all stay and travel days. Use this same calculation for resizing, insertion, travel edits, the header, and yarn tension. Allow edits that release days when the budget is full.

**Demo check.** Two one-day endpoints leave 20 of 22 days free. Insert a one-day stop and grow it to five days to leave 15. Assign one travel day to leave 14, then remove it to return to 15. Verify that shrinking the total below the allocated days is blocked.

## 3. Put the yarn on a real map

Use MapLibre GL JS with an OSM-derived vector tile source. Check the source's geographic coverage, attribution, usage limits, and town-level detail before adopting it. Match the prototype's quiet land and water palette while retaining readable place labels. Store geographic coordinates and project them into a screen-space SVG overlay as the camera moves. Size yarn balls, grab targets, and labels in screen pixels. Let background gestures pan the map and give an active yarn or stop drag exclusive control until release or cancellation.

**Demo check.** Pan and zoom from country to town level. Five independently movable, resizable stops and their connecting yarn stay anchored. On the target laptop, measure that a drag produces a visible update within about 100 ms.

## 4. Implement both yarn shapes and route editing

- **Start and end.** Draw an open strand between the two stops. Pulling any segment previews a new one-day stop between that segment's neighbors. Dropping commits it. Cancelling restores the route and budget.
- **One destination.** Start with one one-day anchor and draw a hanging loop with both ends attached to it. Give the loop a visible lower bend and a generous grab target even when it contains no other stops. The first pull to B produces A → B → A. Draw the outbound and return strands far enough apart to select either one. Pulling the return strand to C produces A → B → C → A. The repeated A refers to the same stop and contributes its stay once. Removing the last added stop restores the hanging loop.
- **Placement and distance.** Accept arbitrary map locations and snap near a suggested town or attraction. While pulling an ordinary leg, show the two prospective straight-line distances. On the first loop pull, both neighbors are the anchor, so show the one-way distance once and label it accordingly. Retain distances in the resulting leg details. Long distances are informational. Clicking the map also adds a stop. As a default, insert it into the geographically nearest leg and highlight that leg before committing.
- **Time and editing.** Drag a ball's center to move it and its edge to resize in whole days. Moving a stop updates its adjacent distances. Tighten the yarn as the budget fills. At zero slack, ordinary legs straighten and further allocation is blocked. Keep a minimal visible bend on the single-anchor loop so its shape remains legible. Distinguish a click on yarn, which opens leg details, from a pull, which inserts a stop.

**Demo check.** Run both routes above. In the loop, give A two stay days and verify the return to A consumes no extra stay. Pull each side separately, cancel a drag, move a stop, exhaust the budget, then free a day and pull again.

## 5. Complete leg postcards, dates, and saved trips

Extend the prototype's stop postcards to legs, with a travel-day control, approximate distance, and editable note. Preserve time and notes across route edits. As a default, splitting a leg keeps its days and note on the first resulting leg and initializes the second at zero. Removing an intermediate stop combines its adjoining travel allocations and retains both leg notes. Derive relative day ranges and absolute calendar dates from the same ordered sequence of stays and travel days. An optional ticket start date enables absolute dates.

Autosave committed changes in versioned browser local storage. Include a trip menu for creating and reopening trips. Keep drag previews transient so a refresh cannot save half an insertion.

**Demo check.** Create three distinct trips, refresh, close and reopen the tab, and switch among them. Confirm route shape, notes, start date, allocations, and date preference survive. Test a trip crossing a month boundary and a loop with travel days on the return leg.

## 6. Add lightweight worldwide suggestions

Use worldwide open place data with viewport-based lookup. First test a candidate provider in a city, a rural region, and outside Europe for coverage, latency, attribution, and permitted request volume. Fetch only after the camera settles at a useful zoom. Cache nearby results, cancel stale requests, and cap visible suggestions at ten. Use available place importance or a cached popularity proxy to rank results. Fetch richer descriptions on card open if needed. Town markers open compact info cards and act as snap targets. Free placement, distance previews, and yarn editing work while requests are pending or unavailable.

**Demo check.** In populated areas on different continents, aim for 5–10 named results with short descriptions and a popularity signal in about two seconds. Measure cold and cached loads separately. Pan rapidly and verify old results cannot replace the current view. Sparse areas can show fewer results.

## Delivery order

The first end-to-end build should demonstrate a real map, the 22-day budget, and a draggable route in each mode. Verify the hanging loop and its first pull before polishing postcards or integrating worldwide suggestions. Finish by running the milestone checks against [the technical requirements](Technical%20Req.md) and comparing the ticket, map overlays, and feedback states with the prototype.

## Final acceptance checklist

The numbers below match the course requirements. All nine must pass, including worldwide suggestions. Leave each box open until its check passes in the running app. Record the build, browser, target laptop, and observed result alongside each completed check. For timing checks, include the measurements and test conditions.

- [ ] **1. Hello world.** Launch the React and TypeScript course demo in a browser. Its opening screen displays “Hello world” and links to Hello Styles.
- [ ] **2. Hello styles.** Verify swatches rendered as divs for #22302A, #E4572E, #FFC93C, #2F8F6B, and #D7385E. Inspect sample paragraphs in Fraunces bold and italic and Figtree regular, medium, and bold. Confirm the fonts load and the pencil, notes, close, and yarn-ball mascot each render as inline SVG.
- [ ] **3. Map.** On the target laptop, open the full-screen OSM-derived vector map. Pan and zoom through country, regional, and town detail without visible lag. Place a stop at a recognizable landmark and verify it stays on that landmark throughout.
- [ ] **4. Day-dots.** Click to create a one-day dot. With at least five dots visible, move and resize each independently. Drag an edge from one through four days and back, checking the displayed count, size, and the other stops. Verify readability across zoom levels and measure input-to-visible-update time against the approximately 100 ms target.
- [ ] **5. Slack and tension.** Start a 22-day trip with two one-day endpoints and observe loose yarn with 20 days free. Pull out a third stop and resize it to five days. Watch the yarn tighten during the drag and verify 15 days remain. Allocate the rest, verify straight, rigid yarn between distinct stops and blocked growth, then release a day and verify slack returns.
- [ ] **6. Yarn insertion.** Grab near either end and in the middle of a strand. Each pull previews a new one-day stop, reroutes the strand, and updates slack immediately. Verify the committed order and that cancelling restores the original values. Repeat on the hanging single-destination loop and on each strand after its first insertion.
- [ ] **7. Travel days and distances.** On one leg, change travel days from zero to two, then three, then zero. Verify remaining days after every change. Pull a new stop, watch both neighboring straight-line distances update during the drag, and compare the final preview with the saved leg details. Verify a long-distance drop succeeds.
- [ ] **8. My trips, notes, and dates.** Save three distinguishable trips in localStorage. Refresh, then close and reopen the tab at the same local address. Select each trip from My trips and verify its map, stops, stay and travel days, yarn, segment notes, and start date. For a trip starting November 12 with a five-day first stay, toggle “Day 1–5” to “Nov 12–16”. Add one travel day and verify the next stay starts November 18.
- [ ] **9. Worldwide suggestions.** Test populated viewports on different continents with cold and warm caches. Time from the end of a pan to 5–10 visible-area results, including the debounce and data fetch. For a passing demo, each result has a name, short description, and identifiable popularity proxy within about two seconds. Click a town marker to open its info card. Verify results change with the viewport and include towns and attractions. Also check that a sparse region with fewer candidates remains usable. If cold lookups miss the target, revise retrieval or precompute the required fields and rerun the check.
