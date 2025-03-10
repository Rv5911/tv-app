export async function parseM3UContent(m3uUrl) {
    try {
        console.log('Fetching M3U content from:', m3uUrl);
        
        // Add request options with CORS mode and credentials
        const options = {
            method: 'GET',
            mode: 'cors',
            credentials: 'same-origin',
            headers: {
                'Accept': 'text/plain',
                'Cache-Control': 'no-cache'
            }
        };
        
        // Try to fetch with the options
        let response;
        try {
            response = await fetch(m3uUrl, options);
        } catch (fetchError) {
            console.error('Initial fetch failed:', fetchError);
            
            // If the first attempt fails, try without credentials (for cross-origin)
            console.log('Retrying without credentials...');
            options.credentials = 'omit';
            response = await fetch(m3uUrl, options);
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch M3U content: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        if (!content || content.trim() === '') {
            throw new Error('Empty M3U content received');
        }
        
        console.log('M3U content fetched successfully, length:', content.length);

        const movies = [];
        const series = [];
        const liveTV = [];

        const lines = content.split('\n');
        let currentItem = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                const metadata = extractMetadata(line);
                currentItem = { ...metadata };
            } else if (line && !line.startsWith('#') && currentItem) {
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

        console.log(`Parsed ${movies.length} movies, ${series.length} series, ${liveTV.length} live TV channels`);

        // ✅ Ensure Database is Initialized Before Storing Data
        try {
            const db = await ensureDatabase();
            await storeData(db, 'movies', movies);
            await storeData(db, 'series', series);
            await storeData(db, 'liveTV', liveTV);
            console.log('Data stored in IndexedDB successfully');
        } catch (dbError) {
            console.error('Error storing data in IndexedDB:', dbError);
            // Continue even if database storage fails
        }

        return { movies, series, liveTV };
    } catch (error) {
        console.error('Error parsing M3U:', error);
        // Try to return any cached data if available
        try {
            const cachedMovies = await getData('movies');
            const cachedSeries = await getData('series');
            const cachedLiveTV = await getData('liveTV');
            
            if (cachedMovies.length > 0 || cachedSeries.length > 0 || cachedLiveTV.length > 0) {
                console.log('Returning cached data due to parsing error');
                return { 
                    movies: cachedMovies, 
                    series: cachedSeries, 
                    liveTV: cachedLiveTV,
                    fromCache: true
                };
            }
        } catch (cacheError) {
            console.error('Error retrieving cached data:', cacheError);
        }
        
        throw error;
    }
}

// ✅ Ensure IndexedDB is Initialized Correctly Before Any Read/Write
async function ensureDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ottdatabase', 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = (event) => {
            const db = event.target.result;

            // 🔹 Check if all object stores exist
            const requiredStores = ['movies', 'series', 'liveTV'];
            const missingStores = requiredStores.filter(store => !db.objectStoreNames.contains(store));

            if (missingStores.length > 0) {
                console.warn(`Missing object stores: ${missingStores.join(', ')}`);
                db.close();
                recreateDatabase().then(resolve).catch(reject);
            } else {
                resolve(db);
            }
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log("Creating object stores...");

            ['movies', 'series', 'liveTV'].forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'url' });
                }
            });
        };
    });
}

// ✅ Recreate Database If Stores Are Missing
function recreateDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase("ottdatabase");

        request.onsuccess = () => {
            console.log("Database deleted. Recreating...");
            const openRequest = indexedDB.open("ottdatabase", 1);

            openRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                ['movies', 'series', 'liveTV'].forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'url' });
                    }
                });
            };

            openRequest.onsuccess = (event) => resolve(event.target.result);
            openRequest.onerror = () => reject(openRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

// ✅ Store Data in IndexedDB
function storeData(db, storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(storeName)) {
            console.warn(`Object store "${storeName}" not found.`);
            return resolve();
        }

        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        store.clear(); // Remove old data

        data.forEach(item => store.add(item));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
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

    const durationMatch = extinfLine.match(/#EXTINF:([\d-]+),/);
    if (durationMatch) metadata.duration = parseInt(durationMatch[1], 10);

    const titleMatch = extinfLine.match(/,(.*)$/);
    if (titleMatch) metadata.title = titleMatch[1];

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

// ✅ Get Data from IndexedDB with Object Store Check
export function getData(storeName) {
    return new Promise((resolve, reject) => {
        ensureDatabase().then(db => {
            if (!db.objectStoreNames.contains(storeName)) {
                console.warn(`Object store "${storeName}" does not exist.`);
                return resolve([]);
            }

            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const getRequest = store.getAll();

            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        }).catch(reject);
    });
}