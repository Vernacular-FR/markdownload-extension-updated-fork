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
