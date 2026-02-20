// HTML to Markdown conversion functions

// setup Turndown with optional inclusion of image links
function setupTurndown(content, options, article, includeImageLinks = true) {

  if (options.turndownEscape) TurndownService.prototype.escape = TurndownService.prototype.defaultEscape;
  else TurndownService.prototype.escape = s => s;

  var turndownService = new TurndownService(options);

  turndownService.use(turndownPluginGfm.gfm)

  turndownService.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);

  let imageList = {};
  // add an image rule
  turndownService.addRule('images', {
    filter: function (node) {
      // if we're looking at an img node with a src
      if (node.nodeName == 'IMG' && node.getAttribute('src')) {
        
        // get the original src
        let src = node.getAttribute('src');
        // set the new src
        node.setAttribute('src', validateUri(src, article.baseURI));
        
        // if we're downloading images, there's more to do.
        if (options.downloadImages) {
          const originalSrc = findOriginalImageUrl(node) || src;
          // generate a file name for the image
          if (!originalSrc) return true;
          let imageFilename = getImageFilename(originalSrc, options, false);
          if (!imageList[originalSrc] || imageList[originalSrc] != imageFilename) {
            // if the imageList already contains this file, add a number to differentiate
            let i = 1;
            while (Object.values(imageList).includes(imageFilename)) {
              const parts = imageFilename.split('.');
              if (i == 1) parts.splice(parts.length - 1, 0, i++);
              else parts.splice(parts.length - 2, 1, i++);
              imageFilename = parts.join('.');
            }
            // add it to the list of images to download later
            imageList[originalSrc] = imageFilename;
          }
          // check if we're doing an obsidian style link
          const obsidianLink = options.imageStyle.startsWith("obsidian");
          // figure out the (local) src of the image
          const localSrc = options.imageStyle === 'obsidian-nofolder'
            // if using "nofolder" then we just need the filename, no folder
            ? imageFilename.substring(imageFilename.lastIndexOf('/') + 1)
            // otherwise we may need to modify the filename to uri encode parts for a pure markdown link
            : imageFilename.split('/').map(s => obsidianLink ? s : encodeURI(s)).join('/');

          // set the new src attribute to be the local filename
          if(options.imageStyle != 'originalSource' && options.imageStyle != 'base64') node.setAttribute('src', localSrc);
          // pass the filter if we're making an obsidian link (or stripping links)
          return true;
        }
        else return true;
      }
      // don't pass the filter, just output a normal markdown link
      return false;
    },
    replacement: function (content, node) {
      // if we're stripping images, output nothing
      if (!includeImageLinks) return '';
      if (options.imageStyle == 'noImage') return '';
      // if this is an obsidian link, so output that
      else if (options.imageStyle.startsWith('obsidian')) return `![[${node.getAttribute('src')}]]`;
      // otherwise, output the normal markdown link
      else {
        var alt = cleanAttribute(node.getAttribute('alt'));
        var src = node.getAttribute('src') || '';
        var title = cleanAttribute(node.getAttribute('title'));
        var titlePart = title ? ' "' + title + '"' : '';
        if (options.imageRefStyle == 'referenced') {
          var id = this.references.length + 1;
          this.references.push('[fig' + id + ']: ' + src + titlePart);
          return '![' + alt + '][fig' + id + ']';
        }
        else return src ? '![' + alt + '](' + src + titlePart + ')' : '';
      }
    },
    references: [],
    append: function () {
      var references = '';
      if (this.references.length) {
        references = '\n\n' + this.references.join('\n') + '\n\n';
        this.references = []; // Reset references
      }
      return references;
    }

  });

  // add a rule for links
  turndownService.addRule('links', {
    filter: function (node) { return node.nodeName == 'A' && node.getAttribute('href'); },
    replacement: function (content, node) {
      var href = node.getAttribute('href');
      var title = cleanAttribute(node.getAttribute('title'));
      var titlePart = title ? ' "' + title + '"' : '';
      if (options.linkStyle == 'inlined' || options.linkStyle == 'inlinedCaps') {
        if (options.linkStyle == 'inlinedCaps') content = content.toUpperCase();
        return '[' + content + '](' + href + titlePart + ')';
      }
      else if (options.linkStyle == 'referenced') {
        var id = this.references.length + 1;
        this.references.push('[' + id + ']: ' + href + titlePart);
        return '[' + content + '][' + id + ']';
      }
      else return content;
    },
    references: [],
    append: function () {
      var references = '';
      if (this.references.length) {
        references = '\n\n' + this.references.join('\n') + '\n\n';
        this.references = [];
      }
      return references;
    }
  });

  turndownService.addRule('codeBlocks', {
    filter: function (node) { return node.nodeName == 'PRE' && node.firstChild && node.firstChild.nodeName == 'CODE'; },
    replacement: function (content, node) {
      var code = node.firstChild.textContent;
      var language = node.firstChild.getAttribute('class') || '';
      if (language) language = language.replace('language-', '');
      return '```' + language + '\n' + code + '\n```';
    }
  });

  turndownService.addRule('code', {
    filter: function (node) {
      var hasSiblings = node.previousSibling || node.nextSibling;
      var isNameCode = node.nodeName == 'CODE' && !hasSiblings;
      return isNameCode;
    },
    replacement: function (content) { return '`' + content + '`'; }
  });

  turndownService.addRule('strikethrough', {
    filter: function (node) { return node.nodeName == 'S' || node.nodeName == 'DEL' || node.nodeName == 'STRIKE'; },
    replacement: function (content) { return '~~' + content + '~~'; }
  });

  turndownService.addRule('highlight', {
    filter: function (node) { return node.nodeName == 'MARK'; },
    replacement: function (content) { return '==' + content + '=='; }
  });

  turndownService.addRule('footnotes', {
    filter: function (node) { return node.nodeName == 'SUP' && node.getAttribute('class') == 'footnote'; },
    replacement: function (content) { return '[^' + content + ']'; }
  });

  turndownService.addRule('tables', {
    filter: function (node) { return node.nodeName == 'TABLE'; },
    replacement: function (content, node) {
      var tables = [], table = [], headers = [];
      var rows = node.querySelectorAll('tr');
      rows.forEach(function (row) {
        var cells = row.querySelectorAll('td, th');
        var rowText = [];
        cells.forEach(function (cell) {
          var cellText = turndownService.turndown(cell.innerHTML);
          rowText.push(cellText);
        });
        if (row.parentNode.nodeName == 'THEAD') headers.push(rowText);
        else table.push(rowText);
      });
      if (headers.length) {
        tables.push(headers[0].join(' | '));
        tables.push(headers[0].map(function () { return '---'; }).join(' | '));
      }
      table.forEach(function (row) { tables.push(row.join(' | ')); });
      return '\n\n' + tables.join('\n') + '\n\n';
    }
  });

  var markdown = turndownService.turndown(content);
  markdown = markdown.replace(/^Press enter or click to view image in full size\s*$/gmi, '').replace(/\n{3,}/g, '\n\n');
  return { markdown, imageList };
}

// function to convert an article info object into markdown
async function convertArticleToMarkdown(article, downloadImages = null, skipPreDownload = false) {
  const options = await getOptions();
  if (downloadImages != null) {
    options.downloadImages = downloadImages;
  }

  // fallback imageStyle when using paired options
  if (!options.imageStyle && options.imageStyleWith && options.imageStyleWithout) {
    options.imageStyle = options.downloadImages ? options.imageStyleWith : options.imageStyleWithout;
  }
  if (!options.downloadImages) options.imageStyle = 'noImage';

  // substitute front and backmatter templates if necessary
  if (options.includeTemplate) {
    options.frontmatter = textReplace(options.frontmatter, article) + '\n';
    options.backmatter = '\n' + textReplace(options.backmatter, article);
  }
  else {
    options.frontmatter = options.backmatter = '';
  }

  options.imagePrefix = textReplace(options.imagePrefix, article, options.disallowedChars)
    .split('/').map(s=>generateValidFileName(s, options.disallowedChars)).join('/');

  // includeImageLinks suit downloadImages ; imageList reste complet pour le download
  const includeImageLinks = !!options.downloadImages;
  let result = setupTurndown(article.content, options, article, includeImageLinks);

  // if inserting images, filter imageList to only include images actually referenced in the markdown
  if (options.downloadImages && includeImageLinks) {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g; let match; const usedImages = new Set();
    while ((match = imageRegex.exec(result.markdown)) !== null) {
      const imageUrl = match[2];
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
        for (const [src, localPath] of Object.entries(result.imageList)) {
          const normalized = localPath.split('\\').join('/').replace(/^\//, '');
          if (imageUrl === normalized || imageUrl.endsWith(normalized)) { usedImages.add(src); break; }
        }
      }
    }
    const newImageList = {}; for (const src of usedImages) newImageList[src] = result.imageList[src];
    result.imageList = newImageList;
  }

  // Appliquer les templates front/back matter uniquement si includeTemplate=true
  if (options.includeTemplate) {
    result.markdown = textReplace(options.frontmatter, article, options.disallowedChars) + result.markdown + textReplace(options.backmatter, article, options.disallowedChars);
  }

  if (options.downloadImages && options.downloadMode == 'downloadsApi' && !skipPreDownload) {
    // pre-download the images
    result = await preDownloadImages(result.imageList, result.markdown);
  }
  return result;
}

/**
 * Pre-download images
 */
async function preDownloadImages(imageList, markdown) {
  const options = await getOptions();
  let newImageList = {};

  // Process all images in parallel
  await Promise.all(Object.entries(imageList).map(([src, filename]) => new Promise(async (resolve, reject) => {
    try {
      // Fetch the image using fetch
      const response = await fetch(src);
      const blob = await response.blob();

      if (options.imageStyle == 'base64') {
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          markdown = markdown.replaceAll(src, reader.result);
          resolve();
        };
        reader.readAsDataURL(blob);
      } else {
        let newFilename = filename;
        
        // Handle unknown extensions
        if (newFilename.endsWith('.idunno')) {
          const mimeType = blob.type || 'application/octet-stream';
          const extension = mimedb[mimeType] || 'bin';
          newFilename = filename.replace('.idunno', `.${extension}`);

          // Update filename in markdown
          if (!options.imageStyle.startsWith("obsidian")) {
            markdown = markdown.replaceAll(
              filename.split('/').map(s => encodeURI(s)).join('/'),
              newFilename.split('/').map(s => encodeURI(s)).join('/')
            );
          } else {
            markdown = markdown.replaceAll(filename, newFilename);
          }
        }

        // Create object URL for the blob
        const blobUrl = URL.createObjectURL(blob);
        newImageList[blobUrl] = newFilename;
        resolve();
      }
    } catch (error) {
      console.error('Error pre-downloading image:', error);
      reject(`A network error occurred attempting to download ${src}`);
    }
  })));

  return { imageList: newImageList, markdown: markdown };
}
