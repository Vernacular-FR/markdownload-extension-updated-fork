// Title formatting functions

// Format title with truncation
async function formatTitle(article, options = {}) {
  const maxLen = options.maxTitleLength || 100;
  const disallowedChars = options.disallowedChars || '';
  
  let title = article.title || article.baseURI || 'untitled';
  
  // Replace template variables
  title = textReplace(options.title, article, disallowedChars + '/');
  
  // Split by path separators and sanitize each part
  title = title.split('/').map(s => generateValidFileName(s, disallowedChars)).join('/');
  
  // Global truncation to respect maxTitleLength
  title = generateValidFileName(title, null, maxLen);
  
  return title;
}

// Format markdown clips folder
async function formatMdClipsFolder(article, options = {}) {
  let folder = options.mdClipsFolder || 'Markdown Clips';
  
  if (options.mdClipsFolderTemplate) {
    folder = textReplace(options.mdClipsFolderTemplate, article, '/');
  }
  
  return folder;
}

// Text replace with article properties
function textReplace(template, article, disallowedChars = '') {
  if (!template) return '';
  
  return template.replace(/{(\w+)}/g, (match, key) => {
    switch (key) {
      case 'title':
        return article.title || 'untitled';
      case 'domain':
        return article.baseURI ? new URL(article.baseURI).hostname : '';
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'time':
        return new Date().toISOString().split('T')[1].split('.')[0];
      default:
        return match;
    }
  });
}
