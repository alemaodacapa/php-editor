(() => {
    'use strict';
    const database = new Promise((resolve, reject) => {
        const request = indexedDB.open('php-studio-workspaces', 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('projects', { keyPath: 'id' });
            request.result.createObjectStore('settings');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    async function transaction(store, mode, operation) {
        const db = await database;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, mode);
            const request = operation(tx.objectStore(store));
            let result;
            request.onsuccess = () => { result = request.result; };
            tx.oncomplete = () => resolve(result);
            tx.onabort = tx.onerror = () => reject(tx.error || new Error('Falha no armazenamento local.'));
        });
    }
    window.StudioStorage = {
        projects: () => transaction('projects', 'readonly', store => store.getAll()),
        project: id => transaction('projects', 'readonly', store => store.get(id)),
        save: project => transaction('projects', 'readwrite', store => store.put(project)),
        get: key => transaction('settings', 'readonly', store => store.get(key)),
        set: (key, value) => transaction('settings', 'readwrite', store => store.put(value, key)),
    };
})();
