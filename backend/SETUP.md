# Poll backend setup (≈5 minutes, once)

Live class polls (e.g. L01 concepts 2 and 3) send answers to a Google Sheet via Google Apps Script.
GitHub Pages can't store data itself. Answers are anonymous: each browser gets a random id; the latest answer per browser counts.

1. Go to <https://sheets.new> (logged in with your Google account). Name it `micro-business polls`.
2. Menu **Extensions → Apps Script**. Delete the default code and paste all of `poll-backend.gs`. Save.
3. **Deploy → New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   → Deploy → authorise (Google warns "unverified app": Advanced → continue; it's your own script).
4. Copy the **Web app URL** (ends in `/exec`).
5. Put it into `assets/js/config.js` → `pollEndpoint: "https://script.google.com/macros/s/…/exec"`, then commit and push (or give the URL to Claude).

Test: open `<URL>?poll=test` in a browser → `{"poll":"test","session":"","n":0,"responses":[]}`.

Without an endpoint the polls run in **local demo mode** (answers stay in that one browser), so slides still work.
