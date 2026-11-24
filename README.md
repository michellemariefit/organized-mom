# The Organized Mom

Michelle Marie's 7-day program as a phone app. Each day's steps are on screen and the worksheets
(aspects, goals, the week, to-dos, meals, routines, the nightly note) are filled in and saved on the phone.

Static site, no build. Open `start.html`. Everything is saved in localStorage under `om:*`.

- `om.js` holds the 7 days of content (`DAYS`) and the worksheets (`renderWS`).
- `om.css` is the shared look (Cormorant Garamond + Jost, off-white and mauve).
- `sw.js` caches the pages for offline use. Bump `VERSION` when files change.
