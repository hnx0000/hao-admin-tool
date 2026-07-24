(() => {
  const DB_NAME = "haoCustomerProjectFiles";
  const STORE_NAME = "files";
  const DB_VERSION = 1;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("projectId", "projectId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveProjectFiles(projectId, fileGroups) {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("projectId");
      const cursorRequest = index.openCursor(IDBKeyRange.only(projectId));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      Object.entries(fileGroups).forEach(([group, files]) => {
        Array.from(files || []).forEach((file, indexNumber) => {
          store.put({
            key: `${projectId}:${group}:${indexNumber}`,
            projectId,
            group,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            updatedAt: Date.now(),
            blob: file,
          });
        });
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }

  async function listProjectFiles(projectId) {
    const database = await openDatabase();
    const records = await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).index("projectId").getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return records.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  }

  async function deleteProjectFiles(projectId) {
    const records = await listProjectFiles(projectId);
    if (!records.length) return;
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      records.forEach((record) => store.delete(record.key));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }

  window.customerFileStore = { saveProjectFiles, listProjectFiles, deleteProjectFiles };
})();
