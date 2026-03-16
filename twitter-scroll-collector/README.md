# Twitter Scroll Collector Extension

Manifest V3 Chrome extension that scrolls the current X/Twitter page and collects tweets visible in the timeline.

## What it does

- Works on `x.com` and `twitter.com`.
- Scrolls the current page until it reaches the target tweet count or stops finding new tweets.
- Extracts:
  - tweet URL
  - author name
  - handle
  - timestamp
  - tweet text
  - collection time
  - source page URL
- Exports the collected tweets as JSON or CSV.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder:

```text
./twitter-scroll-collector
```

## Use

1. Open an X/Twitter page that contains tweets, such as a profile, home timeline, or search results.
2. Open the extension popup.
3. Set the maximum tweet count and scroll delay.
4. Click **Start**.
5. When collection finishes, click **Export JSON** or **Export CSV**.

## Notes

- This uses DOM scraping, so it depends on X/Twitter's page structure and may need selector updates if the site changes.
- It only collects tweets that become available in the currently open page session.
- Some timelines load ads, reposts, or conversation modules; those can affect what appears during scrolling.
