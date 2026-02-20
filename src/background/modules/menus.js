// Context menu creation and management

// Create context menus
function createMenus() {
  browser.contextMenus.removeAll();
  
  // Main download menu
  browser.contextMenus.create({
    id: "download-markdown",
    title: "Save as Markdown",
    contexts: ["page", "selection", "image", "link"]
  });

  // Selection download
  browser.contextMenus.create({
    id: "download-markdown-selection",
    title: "Save Selection as Markdown",
    contexts: ["selection"]
  });

  // Copy menus
  browser.contextMenus.create({
    id: "copy-markdown",
    title: "Copy as Markdown",
    contexts: ["page", "selection", "image", "link"]
  });

  browser.contextMenus.create({
    id: "copy-markdown-selection",
    title: "Copy Selection as Markdown",
    contexts: ["selection"]
  });

  // Obsidian menus
  browser.contextMenus.create({
    id: "copy-markdown-obsidian",
    title: "Copy to Obsidian",
    contexts: ["page", "selection"]
  });

  browser.contextMenus.create({
    id: "copy-markdown-obsall",
    title: "Copy All to Obsidian",
    contexts: ["page"]
  });

  // Link copy
  browser.contextMenus.create({
    id: "copy-markdown-link",
    title: "Copy Link as Markdown",
    contexts: ["link"]
  });

  // Image copy
  browser.contextMenus.create({
    id: "copy-markdown-image",
    title: "Copy Image as Markdown",
    contexts: ["image"]
  });

  // Separator
  browser.contextMenus.create({
    id: "separator",
    type: "separator",
    contexts: ["all"]
  });

  // Toggle menu items
  browser.contextMenus.create({
    id: "toggle-selection",
    title: "Toggle Selection Mode",
    contexts: ["all"]
  });

  browser.contextMenus.create({
    id: "toggle-images",
    title: "Toggle Image Download",
    contexts: ["all"]
  });

  browser.contextMenus.create({
    id: "toggle-template",
    title: "Toggle Template",
    contexts: ["all"]
  });

  console.log("Context menus created");
}
