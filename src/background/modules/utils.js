// Utility functions

// Generate valid filename
function generateValidFileName(title, disallowedChars = '', maxLen = 100) {
  if (!title) title = 'untitled';
  
  // Replace disallowed characters
  if (disallowedChars) {
    const regex = new RegExp(`[${disallowedChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`, 'g');
    title = title.replace(regex, '');
  }
  
  // Remove leading/trailing spaces and slashes
  title = title.trim().replace(/^[/\\]+|[/\\]+$/g, '');
  
  // Truncate if too long
  if (title.length > maxLen) {
    title = title.substring(0, maxLen);
  }
  
  return title || 'untitled';
}

// Base64 encode Unicode
function base64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    function toSolidBytes(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

// Validate and resolve URI
function validateUri(href, baseURI) {
  try {
    new URL(href);
    return href;
  } catch (e) {
    // Not a valid absolute URL, try to resolve relative to base
    try {
      return new URL(href, baseURI).href;
    } catch (e2) {
      return href;
    }
  }
}

// Find original image URL
function findOriginalImageUrl(node) {
  const src = node.getAttribute('src');
  const srcset = node.getAttribute('srcset');
  
  if (srcset) {
    const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
    return sources[0];
  }
  
  return src;
}

// Get image filename
function getImageFilename(src, options = {}, prependFilePath = true) {
  const slashPos = src.lastIndexOf('/');
  const queryPos = src.indexOf('?');
  let filename = src.substring(slashPos + 1, queryPos > 0 ? queryPos : src.length);
  
  if (prependFilePath && options.imagePrefix) {
    filename = options.imagePrefix + filename;
  }
  
  return filename;
}

// Clean attribute value
function cleanAttribute(attr) {
  return attr ? attr.replace(/(\r\n|\n|\r)/gm, '') : '';
}
