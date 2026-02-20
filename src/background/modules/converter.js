// Markdown conversion functions

// Convert article to markdown
async function convertArticleToMarkdown(article, options = {}) {
  const turndownService = new TurndownService({
    headingStyle: options.headingStyle || 'setext',
    codeBlockStyle: options.codeBlockStyle || 'fenced',
    linkStyle: options.linkStyle || 'inlined',
    emDelimiter: options.emDelimiter || '*',
    strongDelimiter: options.strongDelimiter || '**'
  });

  // Add GFM plugin
  turndownService.use(turndownPluginGfm);

  // Configure options
  turndownService.options = {
    ...turndownService.options,
    ...options
  };

  // Convert HTML to markdown
  let markdown = turndownService.turndown(article.content);

  // Add frontmatter
  if (options.frontmatter) {
    markdown = options.frontmatter + '\n\n' + markdown;
  }

  // Add backmatter
  if (options.backmatter) {
    markdown = markdown + '\n\n' + options.backmatter;
  }

  // Extract images if needed
  let imageList = {};
  if (options.downloadImages) {
    imageList = extractImages(markdown);
  }

  return { markdown, imageList };
}
