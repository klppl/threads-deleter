// Threads.com Reply Deleter (language-independent, with error recovery)
//
// Usage:
//   1. Go to https://www.threads.com/@YOUR_USERNAME/replies
//   2. Scroll down as far as you want to load replies
//   3. Open DevTools console (F12 or Ctrl+Shift+J)
//   4. Paste this script and press Enter
//   5. It deletes from bottom to top
//
// Auto-detect username from URL (e.g. threads.com/@username/replies)
const MY_USERNAME = (() => {
  const match = window.location.pathname.match(/^\/@([^/]+)/);
  if (match) return match[1];
  const editBtn = document.querySelector('[href*="edit"]');
  if (editBtn) {
    const container = editBtn.closest('[class]')?.parentElement;
    const usernameEl = container?.querySelector('span[dir="auto"] span');
    if (usernameEl) return usernameEl.textContent.trim();
  }
  console.error('Could not detect username. Set MY_USERNAME manually.');
  return null;
})();

(async function deleteReplies() {
  if (!MY_USERNAME) return;
  console.log(`Deleting replies for @${MY_USERNAME}...`);

  const THREE_DOT_PATH = '4 14C5.10457';
  const POLL_INTERVAL = 150;
  const MENU_TIMEOUT = 1200;
  const STALE_TIMEOUT = 300;
  const DIALOG_TIMEOUT = 1200;
  const SKIP_DELAY = 100;

  const DELETE_WORDS = new Set([
    'delete', 'ta bort', 'supprimer', 'löschen', 'eliminar', 'elimina',
    'excluir', 'verwijderen', 'slet', 'slett', 'poista', 'usuń',
    'удалить', '削除', '删除', '삭제', 'xóa', 'hapus', 'sil',
  ]);

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function waitFor(fn, timeout) {
    return new Promise(resolve => {
      const start = Date.now();
      const check = () => {
        const result = fn();
        if (result) return resolve(result);
        if (Date.now() - start > timeout) return resolve(null);
        setTimeout(check, POLL_INTERVAL);
      };
      check();
    });
  }

  function isDeleteText(text) {
    return DELETE_WORDS.has(text.toLowerCase());
  }

  const failedButtons = new Set();
  const staleButtons = new Set();

  function getAllMyMoreButtons() {
    const results = [];
    const postLinks = document.querySelectorAll(`a[href*="/@${MY_USERNAME}/post/"]`);
    for (const link of postLinks) {
      let container = link;
      let found = false;
      for (let j = 0; j < 8 && !found; j++) {
        container = container.parentElement;
        if (!container) break;
        // Check ALL svgs in this container, not just the first one
        const svgs = container.querySelectorAll('svg');
        for (const svg of svgs) {
          const path = svg.querySelector('path');
          if (path && path.getAttribute('d')?.includes(THREE_DOT_PATH)) {
            const btn = svg.closest('[role="button"]') || svg.parentElement;
            if (!failedButtons.has(btn)) results.push(btn);
            found = true;
            break;
          }
        }
      }
    }
    return results;
  }

  function findVisibleDeleteButton(scope) {
    const root = scope || document;
    for (const btn of root.querySelectorAll('[role="button"]')) {
      if (isDeleteText(btn.textContent.trim())) {
        const r = btn.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return btn;
      }
    }
    return null;
  }

  function dismissEverything() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const overlay = document.querySelector('[role="dialog"]');
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  }

  let deleted = 0;
  const startTime = Date.now();

  // Initial check
  let buttons = getAllMyMoreButtons();
  if (buttons.length === 0) {
    console.log('No replies found. Make sure you are on the Replies tab and have scrolled to load some replies.');
    return;
  }
  console.log(`Found ${buttons.length} replies. Deleting from bottom up...`);

  while (true) {
    dismissEverything();
    await sleep(300);

    buttons = getAllMyMoreButtons();

    // No more buttons — scroll up to find more (virtualization may have hidden them)
    if (buttons.length === 0) {
      let found = false;
      for (let i = 0; i < 15; i++) {
        window.scrollBy(0, -window.innerHeight * 2);
        await sleep(400);
        buttons = getAllMyMoreButtons();
        if (buttons.length > 0) { found = true; break; }
      }
      if (!found) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Done! Deleted ${deleted} in ${elapsed}s.`);
        break;
      }
    }

    // Pick the bottom-most reply
    const moreBtn = buttons[buttons.length - 1];

    const rect = moreBtn.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      moreBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
      await sleep(200);
    }

    moreBtn.click();

    const isStale = staleButtons.has(moreBtn);
    const deleteBtn = await waitFor(() => findVisibleDeleteButton(), isStale ? STALE_TIMEOUT : MENU_TIMEOUT);
    if (!deleteBtn) {
      staleButtons.add(moreBtn);
      failedButtons.add(moreBtn);
      dismissEverything();
      await sleep(SKIP_DELAY);
      continue;
    }

    deleteBtn.click();

    const confirmBtn = await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog ? findVisibleDeleteButton(dialog) : null;
    }, DIALOG_TIMEOUT);

    if (confirmBtn) confirmBtn.click();

    await sleep(1000);

    deleted++;
    const rate = (deleted / ((Date.now() - startTime) / 1000)).toFixed(1);
    console.log(`Deleted ${deleted} (${rate}/s)`);
  }
})();
