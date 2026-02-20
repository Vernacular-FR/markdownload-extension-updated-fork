// Download functions

// Track active downloads
const activeDownloads = new Map();

// Track MarkSnip downloads to handle filename conflicts
const markSnipDownloads = new Map(); // downloadId -> { filename, imageList }
const markSnipUrls = new Map(); // url -> { filename, expectedFilename }

// Download markdown file
async function downloadMarkdown(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
  const options = await getOptions();
  const maxLen = options.maxTitleLength || 100;
  const safeTitle = generateValidFileName(title, options.disallowedChars, maxLen);

  // Download via downloads API
  if (options.downloadMode === 'downloadsApi' && browser.downloads) {
    const hasImages = options.downloadImages && Object.keys(imageList).length > 0;
    
    // Advanced folder mode if images
    if (hasImages) {
      await downloadFolder(markdown, safeTitle, tabId, imageList, mdClipsFolder);
      return;
    }

    // Single-file markdown
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    try {
      if (mdClipsFolder && !mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
      const id = await browser.downloads.download({ 
        url: url, 
        filename: mdClipsFolder + safeTitle + ".md", 
        saveAs: options.saveAs 
      });
      browser.downloads.onChanged.addListener(downloadListener(id, url));
    }
    catch (err) { 
      console.error("Download failed", err); 
    }
  }
}

// Download folder with markdown and images
async function downloadFolder(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
  console.log('[downloadFolder] Starting with', Object.keys(imageList).length, 'images');
  const options = await getOptions();

  // Use title as folder name (remove .md extension if present)
  let folderName = title.replace(/\.md$/, '');
  if (!folderName || folderName.trim() === '') {
    folderName = 'untitled';
  }
  const folderPath = (mdClipsFolder ? mdClipsFolder : '') + folderName + '/';

  // Filter imageList to only include images referenced in markdown
  const filteredImageList = filterReferencedImages(imageList, markdown);
  console.log('[downloadFolder] Filtered to', Object.keys(filteredImageList).length, 'used images');

  // Download markdown
  console.log('[downloadFolder] Creating markdown blob...');
  const mdUrl = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const mdFilename = folderName + '.md';
  console.log('[downloadFolder] Starting markdown download to:', folderPath + mdFilename);
  
  try {
    const mdId = await browser.downloads.download({ 
      url: mdUrl, 
      filename: folderPath + mdFilename, 
      saveAs: false 
    });
    console.log('[downloadFolder] Markdown download started:', mdId);
    setTimeout(() => URL.revokeObjectURL(mdUrl), 60000);
  } catch (err) {
    console.error("Markdown download failed", err);
    URL.revokeObjectURL(mdUrl);
    return;
  }

  // Download images
  await Promise.all(Object.entries(filteredImageList).map(async ([src, filename]) => {
    console.log('[downloadFolder] Downloading image:', src.substring(0, 50), '->', filename);
    try {
      const relPath = filename.split('\\').join('/').replace(/^\//, '');
      const imgId = await browser.downloads.download({ 
        url: src, 
        filename: folderPath + 'images/' + relPath, 
        saveAs: false 
      });
      browser.downloads.onChanged.addListener(downloadListener(imgId, src));
      console.log('[downloadFolder] Image download started:', imgId);
    } catch (err) { 
      console.error('[downloadFolder] Failed to download image:', src, err); 
    }
  }));

  console.log('[downloadFolder] All downloads initiated');
}

// Download listener for cleanup
function downloadListener(id, url) {
  return (delta) => {
    if (delta.state && delta.state.current === 'complete') {
      console.log(`Download ${id} completed`);
      URL.revokeObjectURL(url);
      activeDownloads.delete(id);
    } else if (delta.state && delta.state.current === 'interrupted') {
      console.error(`Download ${id} interrupted`);
      activeDownloads.delete(id);
    }
  };
}

// Handle filename conflicts
function handleFilenameConflict(downloadItem, suggest) {
  console.log(`onDeterminingFilename called for download ${downloadItem.id}`, downloadItem);
  console.log(`Current markSnipDownloads:`, Array.from(markSnipDownloads.keys()));
  console.log(`Current markSnipUrls:`, Array.from(markSnipUrls.keys()));

  const trackedById = markSnipDownloads.has(downloadItem.id);
  const trackedByUrl = downloadItem.url && markSnipUrls.has(downloadItem.url);
  const isBlobUrl = downloadItem.url && downloadItem.url.startsWith('blob:');

  const isMarkSnipDownload = trackedById || trackedByUrl || isBlobUrl;

  if (isMarkSnipDownload) {
    let filename;
    if (trackedById) {
      filename = markSnipDownloads.get(downloadItem.id).filename;
    } else if (trackedByUrl) {
      filename = markSnipUrls.get(downloadItem.url).filename;
    }

    if (filename) {
      console.log(`✅ Suggesting correct filename for MarkSnip download ${downloadItem.id}: ${filename}`);
      suggest({
        filename: filename,
        conflictAction: 'uniquify'
      });
      return;
    }
  }

  console.log(`❌ Not a MarkSnip download ${downloadItem.id}, passing through`);
  suggest();
}
