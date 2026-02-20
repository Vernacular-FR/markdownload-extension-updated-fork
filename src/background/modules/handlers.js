// Event handlers for messages, commands, and context menus

// Handle messages from content scripts and popup
async function handleMessages(message, sender, sendResponse) {
  switch (message.type) {
    case "clip":
      await handleClipRequest(message, sender.tab?.id);
      break;
    case "download":
      await handleDownloadRequest(message);
      break;
    case "download-images":
      await handleImageDownloads(message);
      break;
    case "download-images-content-script":
      await handleImageDownloadsContentScript(message);
      break;
    case "track-download-url":
      markSnipUrls.set(message.url, {
        filename: message.filename,
        expectedFilename: message.expectedFilename
      });
      break;
    default:
      console.log("Unknown message type:", message.type);
  }
}

// Handle clip request
async function handleClipRequest(message, tabId) {
  console.log("Handling clip request for tab", tabId);
  // Implementation will be added
}

// Handle download request
async function handleDownloadRequest(message) {
  console.log("Handling download request");
  // Implementation will be added
}

// Handle image downloads
async function handleImageDownloads(message) {
  console.log("Handling image downloads");
  // Implementation will be added
}

// Handle image downloads from content script
async function handleImageDownloadsContentScript(message) {
  console.log("Handling image downloads from content script");
  // Implementation will be added
}

// Handle commands
async function handleCommands(command, tab) {
  console.log("Handling command:", command);
  
  switch (command) {
    case "download_tab_as_markdown":
      await downloadMarkdownFromContext({ menuItemId: "download-markdown" }, tab);
      break;
    case "copy_tab_as_markdown_link":
      await copyTabAsMarkdownLink(tab);
      break;
    case "copy_all_tabs_as_markdown_links":
      await copyTabAsMarkdownLinkAll(tab);
      break;
    case "copy_selected_tabs_as_markdown_links":
      await copySelectedTabAsMarkdownLink(tab);
      break;
    default:
      console.log("Unknown command:", command);
  }
}

// Handle context menu clicks
async function handleContextMenuClick(info, tab) {
  console.log("Context menu clicked:", info.menuItemId);
  
  switch (info.menuItemId) {
    case "download-markdown":
    case "download-markdown-selection":
      await downloadMarkdownFromContext(info, tab);
      break;
    case "copy-markdown":
    case "copy-markdown-selection":
    case "copy-markdown-link":
    case "copy-markdown-image":
    case "copy-markdown-obsidian":
    case "copy-markdown-obsall":
      await copyMarkdownFromContext(info, tab);
      break;
    case "toggle-selection":
      await toggleSetting("clipSelection");
      break;
    case "toggle-images":
      await toggleSetting("downloadImages");
      break;
    case "toggle-template":
      await toggleSetting("includeTemplate");
      break;
    default:
      console.log("Unknown menu item:", info.menuItemId);
  }
}

// Handle download changes
function handleDownloadChange(delta) {
  console.log("Download changed:", delta);
}

// Handle storage changes
function handleStorageChange(changes, area) {
  console.log("Storage changed:", changes, area);
}

// Toggle setting
async function toggleSetting(key) {
  const options = await browser.storage.sync.get(key);
  const newValue = !options[key];
  await browser.storage.sync.set({ [key]: newValue });
  console.log(`Toggled ${key} to ${newValue}`);
}

// Download markdown from context menu
async function downloadMarkdownFromContext(info, tab) {
  await ensureScripts(tab.id);
  const article = await getArticleFromContent(tab.id, info.menuItemId === "download-markdown-selection");
  const title = await formatTitle(article);
  const mdClipsFolder = await formatMdClipsFolder(article);
  const { markdown, imageList } = await convertArticleToMarkdown(article, null);
  await downloadFolder(markdown, title, tab.id, imageList, mdClipsFolder);
}

// Copy tab as markdown link
async function copyTabAsMarkdownLink(tab) {
  try {
    await ensureScripts(tab.id);
    const article = await getArticleFromContent(tab.id);
    const title = await formatTitle(article);
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: text => copyToClipboard(text),
      args: [`[${title}](${article.baseURI})`]
    });
  }
  catch (error) { console.error("Failed to copy as markdown link: " + error); }
}

// Copy all tabs as markdown links
async function copyTabAsMarkdownLinkAll(tab) {
  try {
    const options = await getOptions();
    options.frontmatter = options.backmatter = '';
    const tabs = await browser.tabs.query({ currentWindow: true });
    const links = [];
    for (const tab of tabs) {
      await ensureScripts(tab.id);
      const article = await getArticleFromContent(tab.id);
      const title = await formatTitle(article);
      links.push(`${options.bulletListMarker} [${title}](${article.baseURI})`);
    }
    const markdown = links.join('\n');
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: text => copyToClipboard(text),
      args: [markdown]
    });
  }
  catch (error) { console.error("Failed to copy as markdown link: " + error); }
}

// Copy selected tabs as markdown links
async function copySelectedTabAsMarkdownLink(tab) {
  try {
    const options = await getOptions();
    options.frontmatter = options.backmatter = '';
    const tabs = await browser.tabs.query({ currentWindow: true, highlighted: true });
    const links = [];
    for (const tab of tabs) {
      await ensureScripts(tab.id);
      const article = await getArticleFromContent(tab.id);
      const title = await formatTitle(article);
      links.push(`${options.bulletListMarker} [${title}](${article.baseURI})`);
    }
    const markdown = links.join('\n');
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: text => copyToClipboard(text),
      args: [markdown]
    });
  }
  catch (error) { console.error("Failed to copy as markdown link: " + error); }
}

// Copy markdown from context
async function copyMarkdownFromContext(info, tab) {
  try {
    await ensureScripts(tab.id);
    if (info.menuItemId === "copy-markdown-link") {
      const options = await getOptions();
      options.frontmatter = options.backmatter = '';
      const article = await getArticleFromContent(tab.id, false);
      const { markdown } = turndown(`<a href="${info.linkUrl}">${info.linkText || info.selectionText}</a>`, { ...options, downloadImages: false }, article);
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: text => copyToClipboard(text),
        args: [markdown]
      });
    }
    else if (info.menuItemId === "copy-markdown-image") {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: text => copyToClipboard(text),
        args: [`![](${info.srcUrl})`]
      });
    }
    else if (info.menuItemId === "copy-markdown-obsidian") {
      const article = await getArticleFromContent(tab.id, info.menuItemId === "copy-markdown-obsidian");
      const title = await formatTitle(article);
      const options = await getOptions();
      const obsidianVault = options.obsidianVault;
      const obsidianFolder = await formatObsidianFolder(article);
      const { markdown } = await convertArticleToMarkdown(article, downloadImages = false);
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: text => copyToClipboard(text),
        args: [markdown]
      });
      await chrome.tabs.update({ url: "obsidian://advanced-uri?vault=" + obsidianVault + "&clipboard=true&mode=new&filepath=" + obsidianFolder + generateValidFileName(title) });
    }
    else if (info.menuItemId === "copy-markdown-obsall") {
      const article = await getArticleFromContent(tab.id, info.menuItemId === "copy-markdown-obsall");
      const title = await formatTitle(article);
      const options = await getOptions();
      const obsidianVault = options.obsidianVault;
      const obsidianFolder = await formatObsidianFolder(article);
      const { markdown } = await convertArticleToMarkdown(article, downloadImages = false);
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: text => copyToClipboard(text),
        args: [markdown]
      });
      await chrome.tabs.update({ url: "obsidian://advanced-uri?vault=" + obsidianVault + "&clipboard=true&mode=new&filepath=" + obsidianFolder + generateValidFileName(title) });
    }
    else {
      const article = await getArticleFromContent(tab.id, info.menuItemId === "copy-markdown-selection");
      const { markdown } = await convertArticleToMarkdown(article, downloadImages = false);
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: text => copyToClipboard(text),
        args: [markdown]
      });
    }
  }
  catch (error) { console.error("Failed to copy text: " + error); }
}

// Format Obsidian folder
async function formatObsidianFolder(article) {
  const options = await getOptions();
  return options.obsidianFolder || 'Inbox';
}

// Get options
async function getOptions() {
  return await browser.storage.sync.get();
}
