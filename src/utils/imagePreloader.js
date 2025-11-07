/**
 * Image preloader utility
 * Preloads images for better performance
 */

/**
 * Preload a single image
 * @param {string} src - Image source URL
 * @returns {Promise} - Promise that resolves when image is loaded
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Preload multiple images
 * @param {string[]} sources - Array of image source URLs
 * @returns {Promise} - Promise that resolves when all images are loaded
 */
export const preloadImages = async (sources) => {
  try {
    await Promise.all(sources.map(src => preloadImage(src).catch(() => null)));
  } catch (error) {
    console.warn('Error preloading images:', error);
  }
};

/**
 * Preload next chapter images
 * @param {string[]} nextChapterImages - Array of next chapter image URLs
 */
export const preloadNextChapter = async (nextChapterImages) => {
  if (!nextChapterImages || nextChapterImages.length === 0) return;
  
  // Preload first few images of next chapter
  const imagesToPreload = nextChapterImages.slice(0, 3);
  await preloadImages(imagesToPreload);
};

export default { preloadImage, preloadImages, preloadNextChapter };

