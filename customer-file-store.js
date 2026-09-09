(() => {
  const DB_NAME = "haoCustomerProjectFiles";
  const FILE_STORE = "files";
  const SUBMISSION_STORE = "submissions";
  const DB_VERSION = 2;

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB 작업이 중단되었습니다."));
    });
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("이 브라우저는 IndexedDB를 지원하지 않습니다."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(FILE_STORE)) {
          const store = database.createObjectStore(FILE_STORE, { keyPath: "key" });
          store.createIndex("projectId", "projectId", { unique: false });
        }
        if (!database.objectStoreNames.contains(SUBMISSION_STORE)) {
          const store = database.createObjectStore(SUBMISSION_STORE, { keyPath: "projectId" });
          store.createIndex("syncStatus", "syncStatus", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteFileRecords(database, projectId, group = "") {
    const transaction = database.transaction(FILE_STORE, "readwrite");
    const index = transaction.objectStore(FILE_STORE).index("projectId");
    const cursorRequest = index.openCursor(IDBKeyRange.only(projectId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      if (!group || cursor.value.group === group) cursor.delete();
      cursor.continue();
    };
    await transactionDone(transaction);
  }

  function putFileRecords(transaction, projectId, fileGroups) {
    const store = transaction.objectStore(FILE_STORE);
    Object.entries(fileGroups || {}).forEach(([group, files]) => {
      Array.from(files || []).forEach((file, indexNumber) => {
        store.put({
          key: `${projectId}:${group}:${indexNumber}`,
          projectId,
          group,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          lastModified: Number(file.lastModified || 0),
          updatedAt: Date.now(),
          blob: file,
        });
      });
    });
  }

  // Delete + replacement + submission metadata commit together. A quota error rolls
  // back the entire transaction instead of destroying the previous attachments.
  async function replaceRecords(database, projectId, fileGroups, submission, group = "") {
    const stores = submission ? [FILE_STORE, SUBMISSION_STORE] : [FILE_STORE];
    const transaction = database.transaction(stores, "readwrite");
    const done = transactionDone(transaction);
    const cursorRequest = transaction.objectStore(FILE_STORE).index("projectId").openCursor(IDBKeyRange.only(projectId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        if (!group || cursor.value.group === group) cursor.delete();
        cursor.continue();
        return;
      }
      try {
        putFileRecords(transaction, projectId, fileGroups);
        if (submission) transaction.objectStore(SUBMISSION_STORE).put(submission);
      } catch { transaction.abort(); }
    };
    await done;
  }

  async function saveProjectFiles(projectId, fileGroups) {
    const database = await openDatabase();
    try {
      await replaceRecords(database, projectId, fileGroups);
    } finally {
      database.close();
    }
  }

  async function saveProjectFileGroup(projectId, group, files) {
    const database = await openDatabase();
    try {
      await replaceRecords(database, projectId, { [group]: files }, null, group);
    } finally {
      database.close();
    }
  }

  async function listProjectFiles(projectId) {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(FILE_STORE, "readonly");
      const records = await requestResult(transaction.objectStore(FILE_STORE).index("projectId").getAll(projectId));
      await transactionDone(transaction);
      return (records || []).sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    } finally {
      database.close();
    }
  }

  async function fileGroupsForProject(projectId) {
    const records = await listProjectFiles(projectId);
    return records.reduce((groups, record) => {
      if (!groups[record.group]) groups[record.group] = [];
      groups[record.group].push(new File([record.blob], record.name, {
        type: record.type || "application/octet-stream",
        lastModified: record.lastModified || record.updatedAt || Date.now(),
      }));
      return groups;
    }, {});
  }

  async function saveLocalSubmission(project, fileGroups) {
    const database = await openDatabase();
    try {
      await replaceRecords(database, project.id, fileGroups, {
        projectId: project.id,
        project,
        syncStatus: "pending",
        attempts: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastError: "",
        remoteSubmissionId: "",
      });
    } finally {
      database.close();
    }
    return { projectId: project.id, status: "pending" };
  }

  async function getLocalSubmission(projectId) {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SUBMISSION_STORE, "readonly");
      const record = await requestResult(transaction.objectStore(SUBMISSION_STORE).get(projectId));
      await transactionDone(transaction);
      return record || null;
    } finally {
      database.close();
    }
  }

  async function updateSubmissionSync(projectId, syncStatus, details = {}) {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SUBMISSION_STORE, "readwrite");
      const store = transaction.objectStore(SUBMISSION_STORE);
      const current = await requestResult(store.get(projectId));
      if (current) {
        store.put({
          ...current,
          ...details,
          syncStatus,
          attempts: Number(current.attempts || 0) + (syncStatus === "uploading" ? 1 : 0),
          updatedAt: Date.now(),
        });
      }
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async function listPendingSubmissions() {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SUBMISSION_STORE, "readonly");
      const records = await requestResult(transaction.objectStore(SUBMISSION_STORE).getAll());
      await transactionDone(transaction);
      return (records || [])
        .filter((record) => ["pending", "failed", "uploading"].includes(record.syncStatus))
        .sort((a, b) => a.updatedAt - b.updatedAt);
    } finally {
      database.close();
    }
  }

  async function deleteProjectFiles(projectId) {
    const database = await openDatabase();
    try {
      await deleteFileRecords(database, projectId);
      const transaction = database.transaction(SUBMISSION_STORE, "readwrite");
      transaction.objectStore(SUBMISSION_STORE).delete(projectId);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  window.customerFileStore = Object.freeze({
    saveProjectFiles,
    saveProjectFileGroup,
    listProjectFiles,
    fileGroupsForProject,
    saveLocalSubmission,
    getLocalSubmission,
    updateSubmissionSync,
    listPendingSubmissions,
    deleteProjectFiles,
  });
})();
