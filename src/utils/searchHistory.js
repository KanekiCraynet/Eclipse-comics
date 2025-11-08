/**
 * Utility for managing search history (recent searches)
 */

const STORAGE_KEY = 'searchHistory';
const MAX_HISTORY_ITEMS = 10;

/**
 * Get search history from localStorage
 */
export const getSearchHistory = () => {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error reading search history:', error);
    return [];
  }
};

/**
 * Add search term to history
 */
export const addToSearchHistory = (keyword) => {
  if (!keyword || keyword.trim().length < 2) {
    return;
  }

  try {
    const history = getSearchHistory();
    const trimmedKeyword = keyword.trim().toLowerCase();
    
    // Remove duplicate if exists
    const filteredHistory = history.filter(item => item.toLowerCase() !== trimmedKeyword);
    
    // Add to beginning
    const newHistory = [trimmedKeyword, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Error saving search history:', error);
  }
};

/**
 * Remove search term from history
 */
export const removeFromSearchHistory = (keyword) => {
  try {
    const history = getSearchHistory();
    const filteredHistory = history.filter(item => item.toLowerCase() !== keyword.toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error('Error removing from search history:', error);
  }
};

/**
 * Clear search history
 */
export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
};

/**
 * Get filtered history based on current input
 */
export const getFilteredHistory = (input) => {
  if (!input || input.trim().length < 1) {
    return getSearchHistory();
  }

  const history = getSearchHistory();
  const lowerInput = input.trim().toLowerCase();
  return history.filter(item => item.toLowerCase().includes(lowerInput));
};

