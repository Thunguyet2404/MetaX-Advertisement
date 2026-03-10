/**
 * MetaX - Background Service Worker
 * Opens popup.html as a standalone popup window (like sMeta desktop app)
 */

chrome.action.onClicked.addListener(async () => {
    // Auto redirect to Telegram author page
    chrome.tabs.create({ url: 'https://t.me/hieunguyen2907' });

    // Check if MetaX window already exists
    const windows = await chrome.windows.getAll({ populate: true });
    const existing = windows.find(w =>
        w.tabs?.some(t => t.url?.includes('popup.html'))
    );

    if (existing) {
        // Focus existing window
        chrome.windows.update(existing.id, { focused: true });
    } else {
        // Create new popup window
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'),
            type: 'popup',
            width: 1780,
            height: 892,
            left: 50,
            top: 50
        });
    }
});
