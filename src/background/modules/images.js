// Image processing functions

// Extract images from markdown
function extractImages(markdown) {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = [];
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push({
      alt: match[1],
      url: match[2]
    });
  }
  
  return images;
}

// Filter images to only those referenced in markdown
function filterReferencedImages(imageList, markdown) {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  const usedImages = new Set();
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    const imageUrl = match[2];
    
    for (const [src, localPath] of Object.entries(imageList)) {
      const normalized = localPath.split('\\').join('/').replace(/^\//, '');
      
      if (imageUrl === normalized || imageUrl.endsWith(normalized) || imageUrl === src) {
        usedImages.add(src);
        break;
      }
    }
  }
  
  const filteredImageList = {};
  for (const src of usedImages) {
    filteredImageList[src] = imageList[src];
  }
  
  return filteredImageList;
}
