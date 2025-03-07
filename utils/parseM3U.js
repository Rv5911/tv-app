export async function parseM3UContent(m3uUrl) {
    const backendUrl = 'http://127.0.0.1:3000';
    const m3uFilePath = `${backendUrl}${m3uUrl}`;

    try {
        console.log('Fetching M3U file from:', m3uFilePath);
        
        const response = await fetch(m3uFilePath);
        const content = await response.text();

        const movies = [];
        const series = [];
        const liveTV = [];

        const lines = content.split('\n');
        let currentItem = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Extract Metadata
            if (line.startsWith('#EXTINF:')) {
                const metadata = extractMetadata(line);
                currentItem = { ...metadata };
            } 
            // Extract URL
            else if (line && !line.startsWith('#') && currentItem) {
                currentItem.url = line;

                if (line.includes('/movie/')) {
                    movies.push(currentItem);
                } else if (line.includes('/series/')) {
                    series.push(currentItem);
                } else {
                    liveTV.push(currentItem);
                }

                currentItem = null; 
            }
        }

        // Store data in IndexedDB
        const db = await openDatabase();
        await storeData(db, 'movies', movies);
        await storeData(db, 'series', series);
        await storeData(db, 'liveTV', liveTV);

        return { movies, series, liveTV };
    } catch (error) {
        console.error('Error parsing M3U:', error);
        throw error;
    }
}

// ✅ Extract metadata like title, logo, duration, and group
function extractMetadata(extinfLine) {
    const metadata = {
        title: '',
        duration: 0,
        logo: '',
        group: '',
        tvgId: '',
        tvgName: '',
        tvgLanguage: '',
        tvgCountry: '',
        tvgShift: '',
        epg: '',
        metadata: extinfLine
    };

    // Extract duration
    const durationMatch = extinfLine.match(/#EXTINF:([\d-]+),/);
    if (durationMatch) metadata.duration = parseInt(durationMatch[1], 10);

    // Extract title
    const titleMatch = extinfLine.match(/,(.*)$/);
    if (titleMatch) metadata.title = titleMatch[1];

    // Extract TVG attributes
    const attributes = {
        tvgId: /tvg-id="(.*?)"/,
        tvgName: /tvg-name="(.*?)"/,
        tvgLanguage: /tvg-language="(.*?)"/,
        tvgCountry: /tvg-country="(.*?)"/,
        tvgShift: /tvg-shift="(.*?)"/,
        epg: /tvg-epg="(.*?)"/,
        logo: /tvg-logo="(.*?)"/,
        group: /group-title="(.*?)"/
    };

    for (const key in attributes) {
        const match = extinfLine.match(attributes[key]);
        if (match) metadata[key] = match[1];
    }

    return metadata;
}

// ✅ Open IndexedDB Database
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('mediaDatabase', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            ['movies', 'series', 'liveTV'].forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'url' });
                }
            });
        };
    });
}

// ✅ Store Data in IndexedDB
function storeData(db, storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        store.clear(); // Remove old data

        data.forEach(item => store.add(item));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export function clearData(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });       
}