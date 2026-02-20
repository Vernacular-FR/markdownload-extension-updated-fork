// Bootstrap file for background scripts
// This file sets up listeners and initializes the extension

// Log platform info
browser.runtime.getPlatformInfo().then(async platformInfo => {
  const browserInfo = browser.runtime.getBrowserInfo ? await browser.runtime.getBrowserInfo() : "Can't get browser info"
  console.info(platformInfo, browserInfo);
});

// Add notification listener for foreground page messages
browser.runtime.onMessage.addListener(handleMessages);
// Keyboard shortcuts
browser.commands.onCommand.addListener(handleCommands);
// Context menus
browser.contextMenus.onClicked.addListener(handleContextMenuClick);
// Download changes
browser.downloads.onChanged.addListener(handleDownloadChange);
// Storage changes
browser.storage.onChanged.addListener(handleStorageChange);
// Filename conflicts
browser.downloads.onDeterminingFilename.addListener(handleFilenameConflict);

// Create context menus
createMenus();

// Configure TurndownService
TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
