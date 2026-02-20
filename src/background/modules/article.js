// Article extraction functions

// Get article from DOM
async function getArticleFromDom(domString) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(domString, "text/html");

  if (dom.documentElement.nodeName == "parsererror") {
    console.error("error while parsing");
    return null;
  }

  const math = {};

  const storeMathInfo = (el, mathInfo) => {
    let randomId = URL.createObjectURL(new Blob([]));
    randomId = randomId.substring(randomId.length - 36);
    el.id = randomId;
    math[randomId] = mathInfo;
  };

  dom.body.querySelectorAll('script[id^=MathJax-Element-]')?.forEach(mathSource => {
    const type = mathSource.attributes.type.value
    storeMathInfo(mathSource, {
      tex: mathSource.innerText,
      inline: type ? !type.includes('mode=display') : false
    });
  });

  dom.body.querySelectorAll('[markdownload-latex]')?.forEach(mathJax3Node => {
    const tex = mathJax3Node.getAttribute('markdownload-latex')
    const display = mathJax3Node.getAttribute('display')
    const inline = !(display && display === 'true')

    const mathNode = document.createElement(inline ? "i" : "p")
    mathNode.textContent = tex;
    mathJax3Node.parentNode.insertBefore(mathNode, mathJax3Node.nextSibling)
    mathJax3Node.parentNode.removeChild(mathJax3Node)

    storeMathInfo(mathNode, {
      tex: tex,
      inline: inline
    });
  });

  dom.body.querySelectorAll('.katex-mathml')?.forEach(kaTeXNode => {
    storeMathInfo(kaTeXNode, {
      tex: kaTeXNode.querySelector('annotation').textContent,
      inline: true
    });
  });

  const article = new Readability(dom).parse();

  if (!article) return null;

  article.math = math;
  return article;
}

// Get article from content script
async function getArticleFromContent(tabId, clipSelection = false) {
  await ensureScripts(tabId);
  const results = await browser.scripting.executeScript({
    target: { tabId: tabId },
    func: () => getSelectionAndDom()
  });
  
  if (results && results[0]) {
    const { dom, selection, baseURI, keywords } = results[0].result;
    const article = await getArticleFromDom(dom);
    if (clipSelection && selection) {
      article.content = selection;
    }
    article.baseURI = baseURI;
    article.keywords = keywords;
    return article;
  }
  else return null;
}

// Ensure content script is loaded
async function ensureScripts(tabId) {
  const results = await browser.scripting.executeScript({
    target: { tabId: tabId },
    func: () => typeof getSelectionAndDom === 'function'
  });
  
  if (!results || results[0].result !== true) {
    await browser.scripting.executeScript({
      target: { tabId: tabId },
      files: ["/contentScript/contentScript.js"]
    });
  }
}
