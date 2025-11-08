# Development Guide - XReader Comics

## Analisa Error dan Best Practices

### 1. Error Handling & Console Logging

#### ❌ Masalah yang Ditemukan
```javascript
// BAD: Menggunakan console.warn/error untuk error yang sudah di-handle
catch (error) {
    console.warn(`Failed to fetch detail for ${komik.title}:`, error);
    return null;
}
```

**Dampak:**
- Console spam yang mengganggu user
- Error yang sebenarnya sudah di-handle dengan graceful fallback terlihat seperti error critical
- Mengurangi kredibilitas aplikasi

#### ✅ Solusi yang Diterapkan
```javascript
// GOOD: Hanya log di development mode, gunakan console.debug
catch (error) {
    // Silently fail and return null - we have fallback data
    if (process.env.NODE_ENV === 'development') {
        console.debug(`[ComponentName] Could not fetch detail, using fallback data`);
    }
    return null;
}
```

**File yang Diperbaiki:**
- `src/components/ListCard/Popular.jsx`
- `src/components/ListCard/Populer.jsx`

---

### 2. Data Type Handling

#### ❌ Masalah yang Ditemukan
```javascript
// BAD: Mengasumsikan chapters[0] selalu object
const latestChapter = chapters[0]?.title;
// Jika chapters[0] adalah string "Chapter 120", ini akan undefined
```

**Dampak:**
- Data hilang karena type assumption
- Fallback value digunakan padahal data valid tersedia

#### ✅ Solusi yang Diterapkan
```javascript
// GOOD: Gunakan helper function yang handle multiple types
const latestChapter = extractChapter(
    komik.latestChapter || komik.chapter,
    'N/A'
);
```

**Helper Function `extractChapter()` menangani:**
- Array: `[{title: "Chapter 240"}]` → `"240"`
- String: `"Ch.940"` → `"940"`
- Object: `{title: "Chapter 240"}` → `"240"`

**File yang Diperbaiki:**
- `src/components/ViewAll.jsx`

---

### 3. Graceful Degradation

#### ✅ Pattern yang Diterapkan
```javascript
// Return fallback data jika detail fetch gagal
const enrichedData = useMemo(() => {
    if (!batchResults || batchResults.length === 0) {
        return comicsToFetch.map(komik => ({
            ...komik,
            thumbnail: komik.image || komik.imageSrc || '',
            rating: '0',
            latestChapter: 'N/A',
            chapterCount: 0,
        }));
    }
    // ... proses batch results
}, [batchResults, comicsToFetch]);
```

**Keuntungan:**
- User tetap melihat konten meskipun API gagal
- UX tidak terganggu
- Progressive enhancement

---

## Best Practices untuk Development

### 1. Console Logging Guidelines

```javascript
// ✅ Development only
if (process.env.NODE_ENV === 'development') {
    console.debug('[ComponentName] Debug info');
}

// ✅ Critical errors only
if (error.response?.status >= 500) {
    console.error('[API] Critical error:', error);
}

// ❌ Avoid
console.warn('Something failed'); // User akan melihat ini!
console.log('Debug info'); // Jangan di production
```

### 2. Data Extraction Pattern

```javascript
// ✅ Gunakan helper functions
import { extractChapter, extractRating, safeImageUrl } from '@/utils/apiHelpers';

const chapter = extractChapter(data.chapter, 'N/A');
const rating = extractRating(data.rating, '0');
const image = safeImageUrl(data.thumbnail);

// ❌ Avoid manual parsing
const chapter = data.chapter[0]?.title || 'N/A';
```

### 3. Error Handling Pattern

```javascript
// ✅ Graceful degradation
try {
    const data = await fetchData();
    return processData(data);
} catch (error) {
    // Log hanya di development
    if (process.env.NODE_ENV === 'development') {
        console.debug('[Component] Fetch failed, using fallback');
    }
    // Return fallback yang valid
    return fallbackData;
}

// ❌ Avoid throwing unhandled errors
try {
    const data = await fetchData();
    return processData(data);
} catch (error) {
    console.error('Failed!', error); // User spam
    throw error; // App crash
}
```

### 4. Fallback Data Pattern

```javascript
// ✅ Provide multiple fallback levels
const thumbnail = safeImageUrl(
    detailData?.thumbnail || 
    komik.image || 
    komik.imageSrc || 
    'https://files.catbox.moe/hu8n6y.jpg' // Default fallback
);

// ✅ Validate before use
const chapters = Array.isArray(data?.chapter) ? data.chapter : [];
const chapterCount = chapters.length;
```

---

## Testing Checklist

Sebelum commit, pastikan:

- [ ] ✅ Console bersih di production mode (no warnings/errors)
- [ ] ✅ Fallback data berfungsi saat API gagal
- [ ] ✅ Type handling correct (string/object/array)
- [ ] ✅ Error boundaries menangkap unhandled errors
- [ ] ✅ Loading states ditampilkan dengan baik
- [ ] ✅ Images memiliki fallback
- [ ] ✅ Tidak ada assumption tentang data structure

---

## Common Pitfalls to Avoid

### 1. Console Spam
**❌ Don't:** Log every error in production
**✅ Do:** Use `console.debug` in development only

### 2. Type Assumptions
**❌ Don't:** Assume `chapters[0]?.title` is always object
**✅ Do:** Use `extractChapter()` helper

### 3. Hard Failures
**❌ Don't:** Throw errors and crash app
**✅ Do:** Return fallback data gracefully

### 4. Missing Fallbacks
**❌ Don't:** Display broken images or "undefined"
**✅ Do:** Provide default images and "N/A" text

---

## Performance Considerations

### Batch Fetching
- Limit concurrent requests (batchSize: 3)
- Add delay between batches (150ms)
- Enable request deduplication
- Cache results (30 minutes TTL)

### Loading States
- Show skeleton loaders
- Progressive content reveal
- Don't block UI for non-critical data

---

## Component Architecture

```
Popular.jsx (Optimized)
├── useKomikcastAPI (Main data)
├── useBatchFetch (Detail data)
│   ├── Rate limiting
│   ├── Error handling
│   └── Fallback data
├── enrichedData (Merged results)
└── Graceful rendering
```

---

## Monitoring & Debugging

### Development Mode
```bash
# Check console for debug logs
NODE_ENV=development npm run dev
```

### Production Mode
```bash
# Console should be clean
npm run build && npm run preview
```

---

## Update History

- **2025-01-XX**: Fixed console spam in Popular/Populer components
- **2025-01-XX**: Fixed chapter type handling in ViewAll
- **2025-01-XX**: Implemented graceful error handling pattern

---

## Contact & Support

Jika menemukan pattern error serupa:
1. Check helper functions di `src/utils/apiHelpers.js`
2. Implement graceful degradation
3. Log hanya di development mode
4. Test dengan API failures (disconnect network)

