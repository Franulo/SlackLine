Technical Requirements
1. "Hello world" app. We will build a minimal app using React and TypeScript that shows
"Hello world" on the opening screen. We will show that it runs in a web browser.
2. "Hello styles." Our style guide requires the colors #22302A, #E4572E, #FFC93C, #2F8F6B
and #D7385E; typefaces Fraunces (bold, plus italic) and Figtree (regular, medium and bold);
and our custom inline SVG icons (pencil, notes, close, yarn-ball mascot). We will add a screen
to our Hello World app where we render divs with these colors; paragraphs with each of these
fonts and weights; and show a sample of each icon.
3. Zoomable open-source map background. We will show a vector map from OpenStreetMap
data (e.g. MapLibre GL JS with an open vector tile source) filling the screen. We need to see
smooth zooming and panning, with country-level, regional and town-level detail, and no visible
lag on our target device. We also need to place our own overlay in screen/geo coordinates on
top of the map and see that it stays anchored to the correct location while zooming and panning.
4. Resizable day-dots (custom drawing and input). We will show that we can place a dot on
the map by clicking and that its default size represents 1 day. Dragging its edge must grow or
shrink it to 2, 3, 4… days, with the day count displayed. We need to see at least 5 dots on the
map, each independently moveable and resizable, with the visual update within about 0.1
seconds of the drag input. Dot sizes must stay readable at different zoom levels.
5. Yarn/thread with slack and tension. We will draw a thread connecting dots in order. Given a
fixed trip length (e.g. 22 days), we compute slack = total days − sum of stay days − travel days
and render the thread's looseness from it. We need to see these behaviors:
- The thread is very loose with only start and end dots (2 of 22 days used).
- Enlarging a dot to 5 days visibly tightens it, with 15 days of slack left.
- At 0 days left the thread is straight and rigid, and further enlarging is blocked.
- The thread updates live while dragging, without noticeable lag.
6. Grabbing the thread to insert a stop. We will show that the user can grab any point on the
thread and drag out a new 1-day dot, which is inserted between its two neighbors in the correct
order. We also need to show that the thread re-routes, and that slack is recalculated
immediately.
7. Edge Day Allocation and Distance Estimation. Users can allocate days not only to
destinations (nodes) but also to travel connections (edges), allowing them to plan multi-day
journeys between stops. We will demonstrate that users can add, modify, and remove days on
an edge, with the total remaining trip duration updating accordingly. Additionally, when users
drag the yarn to create a new stop, the interface will dynamically display the approximate
distance between the relevant locations (either straight-line distance or estimated travel
distance). The distance estimate should update smoothly as the user drags the yarn and
becomes part of the route information once the stop is added.
8. Saved trips, notes and dates. We will show that a trip (dots, day sizes, thread, notes on line
segments, start date) can be saved in the browser (localStorage or IndexedDB) and is still there
after a page refresh and after closing and reopening the tab. We also need to see a trip menu
listing at least 3 saved trips, where clicking one loads it onto the map, and a toggle that switches
the display between relative days ("Day 1-5") and absolute dates ("Nov 12-16"), computed from
a start date.
Extended Requirements
9. Town/site data and popularity suggestions. We will show that we can fetch towns and
attractions for the visible map area from an open source (e.g. Overpass API/OSM tags,
Wikipedia or Wikidata). We need to see 5-10 results with a name, a short description and a
popularity proxy (e.g. Wikidata sitelink count), returned in under about 2 seconds. Clicking a
town marker must open a small info card. Data for a few demo regions may be hard-coded.
Figma 1:
https://www.figma.com/design/DSCgB3k3c79fWvuZH4vKOE/Untitled?node-id=0-1&t=uqVCa5M
cxjtu40Ht-1
Figma 2:
https://www.figma.com/design/6dUV0IXGgmNZFpmNSayz5E/Untitled?node-id=1-2&t=9BCwvN
7StoyVjArR-1
Hi-fi：
https://claude.ai/artifact/RDiuUa6i7qgXHZ4gX8xZva?sk=uhGv-zauoRlAgdip46a2dQ