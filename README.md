# Threads Reply Deleter

Browser console script that bulk-deletes your posts and replies on threads.com.

## Usage

1. Navigate to `https://www.threads.com/@YOUR_USERNAME/replies`
2. Scroll down to load the replies you want to delete
3. Open DevTools (`F12` / `Ctrl+Shift+J`)
4. Paste contents of `delete-replies.js` and run

The script auto-detects your username from the URL, deletes from bottom to top, and scrolls up to find more as it goes.

## How it works

- Finds your posts via `a[href*="/@username/post/"]` links
- Locates the three-dot menu button by SVG path pattern (language-independent)
- Clicks More → Delete → Confirm with polling instead of fixed delays
- Skips posts where Threads' menu crashes (`BarcelonaPostOverflowMenuPopoverQuery` bug on some media posts)
- Tracks failed buttons to avoid retrying stale/already-deleted posts

## Notes

- Deleted posts stay visible in the DOM until page reload — this is normal
- The `ErrorUtils` console errors are Threads' internal bugs, not from the script
- Delete button text is matched against 18+ languages — no config needed
- Threads' self-XSS warning on paste is safe to ignore for your own scripts
