/**
 * Cache Manager
 * Handles local storage and IndexedDB for caching conversations, documents, and chunks
 */

export class CacheManager {
    constructor() {
        this.dbName = 'RAGChatbotDB';
        this.dbVersion = 1;
        this.db = null;
        
        // LocalStorage keys
        this.KEYS = {
            API_KEY: 'gemini_api_key',
            THEME: 'theme_preference',
            SETTINGS: 'app_settings',
            CONVERSATIONS: 'conversations'
        };
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('documents')) {
                    const docStore = db.createObjectStore('documents', { keyPath: 'id' });
                    docStore.createIndex('name', 'name', { unique: false });
                    docStore.createIndex('addedAt', 'addedAt', { unique: false });
                }

                if (!db.objectStoreNames.contains('chunks')) {
                    const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
                    chunkStore.createIndex('docId', 'docId', { unique: false });
                    chunkStore.createIndex('docName', 'docName', { unique: false });
                }

                if (!db.objectStoreNames.contains('conversations')) {
                    const convStore = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
                    convStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // ==================== LocalStorage Methods ====================

    /**
     * Save API key to localStorage
     */
    saveApiKey(apiKey) {
        try {
            localStorage.setItem(this.KEYS.API_KEY, apiKey);
            return true;
        } catch (error) {
            console.error('Error saving API key:', error);
            return false;
        }
    }

    /**
     * Get API key from localStorage
     */
    getApiKey() {
        try {
            return localStorage.getItem(this.KEYS.API_KEY);
        } catch (error) {
            console.error('Error getting API key:', error);
            return null;
        }
    }

    /**
     * Remove API key from localStorage
     */
    removeApiKey() {
        try {
            localStorage.removeItem(this.KEYS.API_KEY);
            return true;
        } catch (error) {
            console.error('Error removing API key:', error);
            return false;
        }
    }

    /**
     * Save theme preference
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.KEYS.THEME, theme);
            return true;
        } catch (error) {
            console.error('Error saving theme:', error);
            return false;
        }
    }

    /**
     * Get theme preference
     */
    getTheme() {
        try {
            return localStorage.getItem(this.KEYS.THEME) || 'light';
        } catch (error) {
            console.error('Error getting theme:', error);
            return 'light';
        }
    }

    /**
     * Save app settings
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    /**
     * Get app settings
     */
    getSettings() {
        try {
            const settings = localStorage.getItem(this.KEYS.SETTINGS);
            return settings ? JSON.parse(settings) : this.getDefaultSettings();
        } catch (error) {
            console.error('Error getting settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            chunkSize: 600,
            chunkOverlap: 100,
            maxContext: 10,
            topKChunks: 3,
            temperature: 0.7,
            apiPlan: 'free',
            model: 'gemini-2.5-flash',
            chatHistory: []
        };
    }

    /**
     * Get a specific setting value
     */
    getSetting(key) {
        try {
            const settings = this.getSettings();
            return settings[key];
        } catch (error) {
            console.error('Error getting setting:', error);
            return null;
        }
    }

    /**
     * Set a specific setting value
     */
    setSetting(key, value) {
        try {
            const settings = this.getSettings();
            settings[key] = value;
            return this.saveSettings(settings);
        } catch (error) {
            console.error('Error setting value:', error);
            return false;
        }
    }

    // ==================== IndexedDB - Documents ====================

    /**
     * Save a document to IndexedDB
     */
    async saveDocument(document) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');
            const request = store.put(document);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all documents
     */
    async getAllDocuments() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readonly');
            const store = transaction.objectStore('documents');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a document by ID
     */
    async getDocument(docId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readonly');
            const store = transaction.objectStore('documents');
            const request = store.get(docId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a document
     */
    async deleteDocument(docId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');
            const request = store.delete(docId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all documents
     */
    async clearAllDocuments() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['documents'], 'readwrite');
            const store = transaction.objectStore('documents');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== IndexedDB - Chunks ====================

    /**
     * Save chunks to IndexedDB
     */
    async saveChunks(chunks) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chunks'], 'readwrite');
            const store = transaction.objectStore('chunks');

            let completed = 0;
            const total = chunks.length;

            chunks.forEach(chunk => {
                const request = store.put(chunk);
                request.onsuccess = () => {
                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                };
                request.onerror = () => reject(request.error);
            });

            if (total === 0) resolve();
        });
    }

    /**
     * Get all chunks
     */
    async getAllChunks() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chunks'], 'readonly');
            const store = transaction.objectStore('chunks');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get chunks by document ID
     */
    async getChunksByDocId(docId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chunks'], 'readonly');
            const store = transaction.objectStore('chunks');
            const index = store.index('docId');
            const request = index.getAll(docId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete chunks by document ID
     */
    async deleteChunksByDocId(docId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chunks'], 'readwrite');
            const store = transaction.objectStore('chunks');
            const index = store.index('docId');
            const request = index.openCursor(IDBKeyRange.only(docId));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all chunks
     */
    async clearAllChunks() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chunks'], 'readwrite');
            const store = transaction.objectStore('chunks');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== IndexedDB - Conversations ====================

    /**
     * Save a complete conversation (for chat history)
     */
    async saveConversation(chatId, messages) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            
            const conversationEntry = {
                id: chatId,
                messages: messages,
                timestamp: Date.now()
            };

            const request = store.put(conversationEntry);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a conversation by ID
     */
    async getConversation(chatId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const request = store.get(chatId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a conversation by ID
     */
    async deleteConversation(chatId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            const request = store.delete(chatId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a conversation message
     */
    async saveConversationMessage(message) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            
            const conversationEntry = {
                role: message.role,
                content: message.content,
                timestamp: new Date().toISOString()
            };

            const request = store.add(conversationEntry);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all conversation messages
     */
    async getAllConversations() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all conversations
     */
    async clearAllConversations() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== Cache Management ====================

    /**
     * Get cache size (approximate)
     */
    async getCacheSize() {
        try {
            let totalSize = 0;

            // LocalStorage size
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }

            // IndexedDB size (approximate)
            const documents = await this.getAllDocuments();
            const chunks = await this.getAllChunks();
            const conversations = await this.getAllConversations();

            totalSize += JSON.stringify(documents).length;
            totalSize += JSON.stringify(chunks).length;
            totalSize += JSON.stringify(conversations).length;

            // Convert to KB
            return Math.round(totalSize / 1024);
        } catch (error) {
            console.error('Error calculating cache size:', error);
            return 0;
        }
    }

    /**
     * Clear all cache (except API key)
     */
    async clearAllCache() {
        try {
            // Clear IndexedDB
            await this.clearAllDocuments();
            await this.clearAllChunks();
            await this.clearAllConversations();

            // Clear localStorage (except API key)
            const apiKey = this.getApiKey();
            localStorage.clear();
            if (apiKey) {
                this.saveApiKey(apiKey);
            }

            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    }

    /**
     * Export all data
     */
    async exportAllData() {
        try {
            const data = {
                exportDate: new Date().toISOString(),
                settings: this.getSettings(),
                theme: this.getTheme(),
                documents: await this.getAllDocuments(),
                chunks: await this.getAllChunks(),
                conversations: await this.getAllConversations()
            };

            return data;
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    /**
     * Import data
     */
    async importData(data) {
        try {
            // Import settings
            if (data.settings) {
                this.saveSettings(data.settings);
            }

            // Import theme
            if (data.theme) {
                this.saveTheme(data.theme);
            }

            // Import documents
            if (data.documents && Array.isArray(data.documents)) {
                for (const doc of data.documents) {
                    await this.saveDocument(doc);
                }
            }

            // Import chunks
            if (data.chunks && Array.isArray(data.chunks)) {
                await this.saveChunks(data.chunks);
            }

            // Import conversations
            if (data.conversations && Array.isArray(data.conversations)) {
                for (const conv of data.conversations) {
                    await this.saveConversationMessage(conv);
                }
            }

            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}
