/**
 * Main Application Orchestrator
 * Coordinates all modules and handles user interactions
 */

import { CacheManager } from './cache-manager.js';
import { RAGEngine } from './rag-engine.js';
import { GeminiAPI } from './gemini-api.js';
import { ChatUI } from './chat-ui.js';

class RAGChatbotApp {
    constructor() {
        this.cacheManager = new CacheManager();
        this.ragEngine = null;
        this.geminiAPI = new GeminiAPI();
        this.chatUI = new ChatUI();
        
        this.conversationHistory = [];
        this.isProcessing = false;
        this.currentChatId = this.generateChatId();
        this.chatSpecificKnowledge = false;
        this.chatHistory = [];
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize cache manager
            await this.cacheManager.init();
            console.log('✓ Cache Manager initialized');

            // Initialize RAG engine
            this.ragEngine = new RAGEngine(this.cacheManager);
            await this.ragEngine.loadFromCache();
            console.log('✓ RAG Engine initialized');

            // Initialize Chat UI
            this.chatUI.init();
            console.log('✓ Chat UI initialized');

            // Load settings
            this.loadSettings();
            console.log('✓ Settings loaded');

            // Setup event listeners
            this.setupEventListeners();
            console.log('✓ Event listeners setup');

            // Update UI stats
            this.updateStats();
            console.log('✓ Stats updated');

            // Load chat history
            await this.loadChatHistory();
            console.log('✓ Chat history loaded');

            // Check for API key
            this.checkApiKey();
            console.log('✓ API key checked');

        } catch (error) {
            console.error('Initialization error:', error);
            alert('Failed to initialize the application. Please refresh the page.');
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Send message
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.handleSendMessage();
        });

        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFileUpload(e.dataTransfer.files);
        });

        // Add text to knowledge base
        document.getElementById('addTextBtn').addEventListener('click', () => {
            this.handleAddText();
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        // New chat button
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.startNewChat();
        });

        // Knowledge base button
        document.getElementById('knowledgeBtn').addEventListener('click', () => {
            this.openKnowledgeBase();
        });

        // Close knowledge modal
        document.getElementById('closeKnowledgeBtn').addEventListener('click', () => {
            this.closeKnowledgeBase();
        });

        // Chat-specific knowledge toggle
        document.getElementById('chatSpecificKnowledge').addEventListener('change', (e) => {
            this.chatSpecificKnowledge = e.target.checked;
            this.cacheManager.setSetting('chatSpecificKnowledge', this.chatSpecificKnowledge);
            // Reload documents for current context
            this.updateDocumentList();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.showExportMenu();
        });

        // Clear chat button
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            this.clearChat();
        });

        // Settings modal
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('updateApiKeyBtn').addEventListener('click', () => {
            this.updateApiKey();
        });

        document.getElementById('clearCacheBtn').addEventListener('click', () => {
            this.clearCache();
        });

        // API key modal
        document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
            this.saveApiKeyFromModal();
        });

        // Temperature slider
        document.getElementById('temperature').addEventListener('input', (e) => {
            document.getElementById('temperatureValue').textContent = e.target.value;
        });

        // API plan selection
        document.getElementById('apiPlan').addEventListener('change', (e) => {
            this.updateModelOptions(e.target.value);
        });

        // Model selection
        document.getElementById('modelSelect').addEventListener('change', (e) => {
            this.updateModelDescription(e.target.value);
        });
    }

    /**
     * Check if API key exists
     */
    checkApiKey() {
        const apiKey = this.cacheManager.getApiKey();
        
        if (apiKey) {
            // API key exists, set it and hide modal
            this.geminiAPI.setApiKey(apiKey);
            document.getElementById('apiKeyModal').classList.remove('active');
            console.log('✓ API key loaded from cache');
        } else {
            // No API key, show modal
            document.getElementById('apiKeyModal').classList.add('active');
            console.log('⚠ No API key found, showing modal');
        }
    }

    /**
     * Save API key from modal
     */
    async saveApiKeyFromModal() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput.value.trim();
        const errorDiv = document.getElementById('apiKeyError');

        if (!apiKey) {
            errorDiv.textContent = 'Please enter an API key';
            return;
        }

        errorDiv.textContent = 'Validating...';

        // Validate API key
        const validation = await this.geminiAPI.validateApiKey(apiKey);

        if (validation.valid) {
            this.cacheManager.saveApiKey(apiKey);
            this.geminiAPI.setApiKey(apiKey);
            document.getElementById('apiKeyModal').classList.remove('active');
            errorDiv.textContent = '';
            this.chatUI.showInfo('API key validated and saved successfully!');
        } else {
            errorDiv.textContent = validation.error;
        }
    }

    /**
     * Handle sending a message
     */
    async handleSendMessage() {
        if (this.isProcessing) return;

        const message = this.chatUI.getMessageInput();
        
        if (!message) return;

        // Disable input
        this.isProcessing = true;
        this.chatUI.disableInput();
        this.chatUI.clearMessageInput();

        // Add user message
        this.chatUI.addUserMessage(message);
        this.conversationHistory.push({ role: 'user', content: message });

        // Save to cache
        await this.cacheManager.saveConversationMessage({ role: 'user', content: message });

        // Show typing indicator
        this.chatUI.showTypingIndicator();

        // Get relevant chunks
        const settings = this.cacheManager.getSettings();
        const relevantChunks = this.ragEngine.retrieveRelevantChunks(message, settings.topKChunks);

        // Show context info if chunks found
        if (relevantChunks.length > 0) {
            const docNames = [...new Set(relevantChunks.map(c => c.docName))].join(', ');
            this.chatUI.addSystemMessage(
                `Using context from ${relevantChunks.length} chunk(s) in: ${docNames}`
            );
        }

        // Get conversation context (limited)
        const contextHistory = this.geminiAPI.truncateHistory(
            this.conversationHistory.slice(0, -1), // Exclude current message
            settings.maxContext
        );

        try {
            // Generate response (non-streaming for reliability)
            const response = await this.geminiAPI.generateResponse(
                message,
                contextHistory,
                relevantChunks,
                settings.temperature
            );

            // Hide typing indicator
            this.chatUI.hideTypingIndicator();

            if (response.success) {
                const fullResponse = response.text;
                
                // Add bot message
                this.chatUI.addBotMessage(fullResponse, true);

                // Add to conversation history
                this.conversationHistory.push({ role: 'bot', content: fullResponse });

                // Save to cache
                await this.cacheManager.saveConversationMessage({ role: 'bot', content: fullResponse });

                // Update stats
                this.updateStats();
            } else {
                this.chatUI.showError(`Failed to generate response: ${response.error}`);
            }

        } catch (error) {
            console.error('Error generating response:', error);
            this.chatUI.hideTypingIndicator();
            this.chatUI.showError(`Failed to generate response: ${error.message}`);
        }

        // Enable input
        this.isProcessing = false;
        this.chatUI.enableInput();
    }

    /**
     * Handle file upload
     */
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            try {
                this.chatUI.showInfo(`Processing file: ${file.name}...`);

                // Extract text from file
                const text = await this.ragEngine.extractTextFromFile(file);

                // Add to RAG engine with chat scope
                const result = await this.ragEngine.addDocument(
                    file.name,
                    text,
                    this.chatSpecificKnowledge ? this.currentChatId : 'global'
                );

                if (result.success) {
                    this.chatUI.showInfo(
                        `Added "${file.name}" - ${result.chunkCount} chunks created`
                    );
                    this.addDocumentToUI(result.docId, file.name, result.chunkCount);
                    this.updateStats();
                } else {
                    this.chatUI.showError(`Failed to add "${file.name}": ${result.error}`);
                }
            } catch (error) {
                console.error('File upload error:', error);
                this.chatUI.showError(`Error processing "${file.name}": ${error.message}`);
            }
        }

        // Clear file input
        document.getElementById('fileInput').value = '';
    }

    /**
     * Handle adding text to knowledge base
     */
    async handleAddText() {
        const textInput = document.getElementById('textInput');
        const text = textInput.value.trim();

        if (!text) {
            alert('Please enter some text');
            return;
        }

        try {
            const fileName = `Text_${Date.now()}.txt`;
            const result = await this.ragEngine.addDocument(
                fileName,
                text,
                this.chatSpecificKnowledge ? this.currentChatId : 'global'
            );

            if (result.success) {
                this.chatUI.showInfo(
                    `Added text document - ${result.chunkCount} chunks created`
                );
                this.updateDocumentList();
                this.updateStats();
                textInput.value = '';
            } else {
                this.chatUI.showError(`Failed to add text: ${result.error}`);
            }
        } catch (error) {
            console.error('Add text error:', error);
            this.chatUI.showError(`Error adding text: ${error.message}`);
        }
    }

    /**
     * Add document to UI list
     */
    addDocumentToUI(docId, docName, chunkCount) {
        const documentList = document.getElementById('documentList');
        
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        docItem.dataset.docId = docId;
        
        docItem.innerHTML = `
            <div class="document-info">
                <div class="document-name">${docName}</div>
                <div class="document-meta">${chunkCount} chunks</div>
            </div>
            <button class="document-delete" onclick="app.removeDocument('${docId}')"><i class="fas fa-times"></i></button>
        `;
        
        documentList.appendChild(docItem);
    }

    /**
     * Remove document
     */
    async removeDocument(docId) {
        if (!confirm('Are you sure you want to remove this document?')) return;

        try {
            await this.ragEngine.removeDocument(docId);
            
            this.updateDocumentList();
            this.updateStats();
            this.chatUI.showInfo('Document removed successfully');
        } catch (error) {
            console.error('Remove document error:', error);
            this.chatUI.showError(`Failed to remove document: ${error.message}`);
        }
    }

    /**
     * Update document list in modal
     */
    async updateDocumentList() {
        const documentList = document.getElementById('documentList');
        const allDocs = await this.cacheManager.getAllDocuments();
        
        // Filter documents based on scope
        const documents = this.chatSpecificKnowledge 
            ? allDocs.filter(doc => doc.chatId === this.currentChatId)
            : allDocs.filter(doc => !doc.chatId || doc.chatId === 'global');

        documentList.innerHTML = '';

        if (documents.length === 0) {
            documentList.innerHTML = '<p style=\"text-align: center; color: var(--text-tertiary); padding: 2rem;\">No documents uploaded yet</p>';
            return;
        }

        for (const doc of documents) {
            const chunks = await this.cacheManager.getChunksByDocumentId(doc.id);
            const totalChars = doc.content ? doc.content.length : 0;

            const docItem = document.createElement('div');
            docItem.className = 'document-item';
            docItem.dataset.docId = doc.id;
            
            docItem.innerHTML = `
                <div class=\"document-info\">
                    <div class=\"document-name\"><i class=\"fas fa-file-alt\"></i> ${doc.name}</div>
                    <div class=\"document-meta\">${totalChars} chars • ${chunks.length} chunks</div>
                </div>
                <button class=\"document-delete\" onclick=\"app.removeDocument('${doc.id}')\" title=\"Delete\">
                    <i class=\"fas fa-trash\"></i>
                </button>
            `;
            
            documentList.appendChild(docItem);
        }

        // Update count in modal
        const docCountEl = document.querySelector('#knowledgeModal #docCount');
        if (docCountEl) {
            docCountEl.textContent = documents.length;
        }
    }

    /**
     * Update statistics
     */
    updateStats() {
        const stats = this.ragEngine.getStats();
        
        // Update doc count elements (only if they exist - they're in the knowledge modal)
        const docCountEls = document.querySelectorAll('#docCount, #docCountStat');
        docCountEls.forEach(el => {
            if (el) el.textContent = stats.documentCount;
        });
        
        // Update chunk count (only if element exists)
        const chunkCountEl = document.getElementById('chunkCount');
        if (chunkCountEl) {
            chunkCountEl.textContent = stats.chunkCount;
        }
        
        // Update char count if element exists
        const charCountEl = document.getElementById('charCount');
        if (charCountEl && stats.totalChars) {
            charCountEl.textContent = stats.totalChars.toLocaleString();
        }
    }

    /**
     * Start a new chat
     */
    async startNewChat() {
        if (this.conversationHistory.length > 0) {
            if (!confirm('Start a new chat? Current conversation will be saved to history.')) {
                return;
            }
            
            // Save current chat to history
            await this.saveCurrentChatToHistory();
        }

        // Reset for new chat
        this.currentChatId = this.generateChatId();
        this.conversationHistory = [];
        this.chatUI.clearChat();
        this.chatUI.showInfo('Started a new chat session');
        this.updateStats();
        
        // Reload chat history list
        await this.loadChatHistory();
    }

    /**
     * Generate chat ID
     */
    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Save current chat to history
     */
    async saveCurrentChatToHistory() {
        if (this.conversationHistory.length === 0) return;

        // Generate title from first user message
        const firstUserMsg = this.conversationHistory.find(msg => msg.role === 'user');
        const title = firstUserMsg 
            ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
            : 'Untitled Chat';

        const chatData = {
            id: this.currentChatId,
            title: title,
            timestamp: Date.now(),
            messages: this.conversationHistory,
            documentsScope: this.chatSpecificKnowledge ? 'chat-specific' : 'global'
        };

        // Save to IndexedDB
        await this.cacheManager.saveConversation(this.currentChatId, this.conversationHistory);
        
        // Add to chat history array
        this.chatHistory.unshift(chatData);
        await this.cacheManager.setSetting('chatHistory', this.chatHistory);
    }

    /**
     * Load chat history
     */
    async loadChatHistory() {
        this.chatHistory = await this.cacheManager.getSetting('chatHistory') || [];
        
        const chatHistoryList = document.getElementById('chatHistoryList');
        chatHistoryList.innerHTML = '';

        // Add current chat
        const currentChatEl = this.createChatHistoryItem({
            id: this.currentChatId,
            title: 'Current Chat',
            timestamp: Date.now(),
            isActive: true
        });
        chatHistoryList.appendChild(currentChatEl);

        // Add saved chats
        this.chatHistory.forEach(chat => {
            const chatEl = this.createChatHistoryItem(chat);
            chatHistoryList.appendChild(chatEl);
        });
    }

    /**
     * Create chat history item element
     */
    createChatHistoryItem(chat) {
        const div = document.createElement('div');
        div.className = 'chat-history-item' + (chat.isActive ? ' active' : '');
        div.dataset.chatId = chat.id;

        const timeStr = chat.isActive ? 'Just now' : this.formatTimeAgo(chat.timestamp);

        div.innerHTML = `
            <div class=\"chat-history-content\">
                <div class=\"chat-history-title\">${chat.title}</div>
                <div class=\"chat-history-time\">${timeStr}</div>
            </div>
            <button class=\"chat-history-delete\" title=\"Delete chat\"><i class=\"fas fa-trash\"></i></button>
        `;

        // Click to load chat (not for active chat)
        if (!chat.isActive) {
            div.querySelector('.chat-history-content').addEventListener('click', () => {
                this.loadChat(chat.id);
            });
        }

        // Delete button
        div.querySelector('.chat-history-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteChat(chat.id);
        });

        return div;
    }

    /**
     * Load a chat from history
     */
    async loadChat(chatId) {
        // Save current chat if it has messages
        if (this.conversationHistory.length > 0) {
            await this.saveCurrentChatToHistory();
        }

        // Find chat in history
        const chat = this.chatHistory.find(c => c.id === chatId);
        if (!chat) return;

        // Load chat
        this.currentChatId = chatId;
        this.conversationHistory = chat.messages || [];
        this.chatSpecificKnowledge = chat.documentsScope === 'chat-specific';

        // Update UI
        document.getElementById('chatSpecificKnowledge').checked = this.chatSpecificKnowledge;
        this.chatUI.clearChat();
        
        // Render messages
        this.conversationHistory.forEach(msg => {
            if (msg.role === 'user') {
                this.chatUI.addUserMessage(msg.content);
            } else if (msg.role === 'bot' || msg.role === 'model' || msg.role === 'assistant') {
                this.chatUI.addBotMessage(msg.content);
            }
        });

        // Reload chat history UI
        await this.loadChatHistory();
        this.updateStats();
    }

    /**
     * Delete a chat
     */
    async deleteChat(chatId) {
        if (chatId === this.currentChatId) {
            alert('Cannot delete the current active chat.');
            return;
        }

        if (!confirm('Delete this chat? This action cannot be undone.')) return;

        // Remove from history
        this.chatHistory = this.chatHistory.filter(c => c.id !== chatId);
        await this.cacheManager.setSetting('chatHistory', this.chatHistory);

        // Remove from IndexedDB
        await this.cacheManager.db.delete('conversations', chatId);

        // Reload list
        await this.loadChatHistory();
    }

    /**
     * Format timestamp as time ago
     */
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        
        return new Date(timestamp).toLocaleDateString();
    }

    /**
     * Open knowledge base modal
     */
    openKnowledgeBase() {
        document.getElementById('knowledgeModal').classList.add('active');
        // Refresh document list
        this.updateDocumentList();
    }

    /**
     * Close knowledge base modal
     */
    closeKnowledgeBase() {
        document.getElementById('knowledgeModal').classList.remove('active');
    }

    /**
     * Open settings modal
     */
    openSettings() {
        const settings = this.cacheManager.getSettings();
        
        document.getElementById('chunkSize').value = settings.chunkSize;
        document.getElementById('chunkOverlap').value = settings.chunkOverlap;
        document.getElementById('maxContext').value = settings.maxContext;
        document.getElementById('topKChunks').value = settings.topKChunks;
        document.getElementById('temperature').value = settings.temperature;
        document.getElementById('temperatureValue').textContent = settings.temperature;
        document.getElementById('apiPlan').value = settings.apiPlan || 'free';
        
        // Update model options and select current model
        this.updateModelOptions(settings.apiPlan || 'free');
        document.getElementById('modelSelect').value = settings.model || 'gemini-2.5-flash';
        this.updateModelDescription(settings.model || 'gemini-2.5-flash');
        
        document.getElementById('settingsModal').classList.add('active');
    }

    /**
     * Update model options based on API plan
     */
    updateModelOptions(plan) {
        const modelSelect = document.getElementById('modelSelect');
        const models = this.geminiAPI.getAvailableModelsForPlan(plan);
        
        modelSelect.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
        
        // Update description for first model
        if (models.length > 0) {
            this.updateModelDescription(models[0].id);
        }
    }

    /**
     * Update model description
     */
    updateModelDescription(modelId) {
        const allModels = [...this.geminiAPI.models.free, ...this.geminiAPI.models.pro];
        const model = allModels.find(m => m.id === modelId);
        const descElement = document.getElementById('modelDescription');
        
        if (model) {
            descElement.textContent = model.description;
        }
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    /**
     * Save settings
     */
    saveSettings() {
        const settings = {
            chunkSize: parseInt(document.getElementById('chunkSize').value),
            chunkOverlap: parseInt(document.getElementById('chunkOverlap').value),
            maxContext: parseInt(document.getElementById('maxContext').value),
            topKChunks: parseInt(document.getElementById('topKChunks').value),
            temperature: parseFloat(document.getElementById('temperature').value),
            apiPlan: document.getElementById('apiPlan').value,
            model: document.getElementById('modelSelect').value
        };

        this.cacheManager.saveSettings(settings);
        this.ragEngine.updateConfig(settings.chunkSize, settings.chunkOverlap);
        this.geminiAPI.setTemperature(settings.temperature);
        this.geminiAPI.setApiPlan(settings.apiPlan);
        this.geminiAPI.setModel(settings.model);

        const modelInfo = this.geminiAPI.getCurrentModelInfo();
        this.closeSettings();
        this.chatUI.showInfo(`Settings saved! Using ${modelInfo.name}`);
    }

    /**
     * Load settings
     */
    loadSettings() {
        const settings = this.cacheManager.getSettings();
        this.ragEngine.updateConfig(settings.chunkSize, settings.chunkOverlap);
        this.geminiAPI.setTemperature(settings.temperature);
        this.geminiAPI.setApiPlan(settings.apiPlan || 'free');
        this.geminiAPI.setModel(settings.model || 'gemini-2.5-flash');
        
        // Load chat-specific knowledge setting
        this.chatSpecificKnowledge = settings.chatSpecificKnowledge || false;
    }

    /**
     * Update API key from settings
     */
    async updateApiKey() {
        const apiKeyInput = document.getElementById('settingsApiKey');
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            alert('Please enter an API key');
            return;
        }

        // Validate API key
        const validation = await this.geminiAPI.validateApiKey(apiKey);

        if (validation.valid) {
            this.cacheManager.saveApiKey(apiKey);
            this.geminiAPI.setApiKey(apiKey);
            alert('API key updated successfully!');
            apiKeyInput.value = '';
        } else {
            alert(`Invalid API key: ${validation.error}`);
        }
    }

    /**
     * Open knowledge base modal
     */
    openKnowledgeBase() {
        document.getElementById('knowledgeModal').classList.add('active');
        // Refresh document list
        this.updateDocumentList();
    }

    /**
     * Close knowledge base modal
     */
    closeKnowledgeBase() {
        document.getElementById('knowledgeModal').classList.remove('active');
    }

    /**
     * Update document list in modal
     */
    async updateDocumentList() {
        const documentList = document.getElementById('documentList');
        const documents = await this.ragEngine.getAllDocuments();
        
        // Filter documents based on scope
        const filteredDocs = this.chatSpecificKnowledge 
            ? documents.filter(doc => doc.chatId === this.currentChatId)
            : documents.filter(doc => !doc.chatId || doc.chatId === 'global');

        documentList.innerHTML = '';

        filteredDocs.forEach(doc => {
            const docEl = document.createElement('div');
            docEl.className = 'document-item';
            docEl.innerHTML = `
                <div class="document-info">
                    <div class="document-name"><i class="fas fa-file-alt"></i> ${doc.name}</div>
                    <div class="document-meta">${doc.size} chars • ${doc.chunks} chunks</div>
                </div>
                <button class="document-delete" onclick="app.deleteDocument('${doc.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            documentList.appendChild(docEl);
        });

        if (filteredDocs.length === 0) {
            documentList.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 2rem;">No documents uploaded yet</p>';
        }
    }

    /**
     * Generate chat ID
     */
    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Start new chat
     */
    async startNewChat() {
        if (this.conversationHistory.length > 0) {
            const confirmStart = confirm('Start a new chat? Current chat will be saved to history.');
            if (!confirmStart) return;

            // Save current chat to history
            await this.saveCurrentChatToHistory();
        }

        // Reset chat state
        this.currentChatId = this.generateChatId();
        this.conversationHistory = [];
        this.chatUI.clearChat();
        this.updateStats();

        // Reload chat history list
        this.loadChatHistory();
    }

    /**
     * Save current chat to history
     */
    async saveCurrentChatToHistory() {
        if (this.conversationHistory.length === 0) return;

        // Generate title from first user message
        const firstUserMsg = this.conversationHistory.find(msg => msg.role === 'user');
        const title = firstUserMsg 
            ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
            : 'Untitled Chat';

        const chatData = {
            id: this.currentChatId,
            title: title,
            timestamp: Date.now(),
            messages: this.conversationHistory,
            documentsScope: this.chatSpecificKnowledge ? 'chat-specific' : 'global'
        };

        // Save to IndexedDB
        await this.cacheManager.saveConversation(this.currentChatId, this.conversationHistory);
        
        // Add to chat history array
        this.chatHistory.unshift(chatData);
        await this.cacheManager.setSetting('chatHistory', this.chatHistory);
    }

    /**
     * Load chat history
     */
    async loadChatHistory() {
        this.chatHistory = await this.cacheManager.getSetting('chatHistory') || [];
        
        const chatHistoryList = document.getElementById('chatHistoryList');
        chatHistoryList.innerHTML = '';

        // Add current chat
        const currentChatEl = this.createChatHistoryItem({
            id: this.currentChatId,
            title: 'Current Chat',
            timestamp: Date.now(),
            isActive: true
        });
        chatHistoryList.appendChild(currentChatEl);

        // Add saved chats
        this.chatHistory.forEach(chat => {
            const chatEl = this.createChatHistoryItem(chat);
            chatHistoryList.appendChild(chatEl);
        });
    }

    /**
     * Create chat history item element
     */
    createChatHistoryItem(chat) {
        const div = document.createElement('div');
        div.className = 'chat-history-item' + (chat.isActive ? ' active' : '');
        div.dataset.chatId = chat.id;

        const timeStr = chat.isActive ? 'Just now' : this.formatTimeAgo(chat.timestamp);

        div.innerHTML = `
            <div class="chat-history-content">
                <div class="chat-history-title">${chat.title}</div>
                <div class="chat-history-time">${timeStr}</div>
            </div>
            <button class="chat-history-delete" title="Delete chat"><i class="fas fa-trash"></i></button>
        `;

        // Click to load chat
        div.querySelector('.chat-history-content').addEventListener('click', () => {
            if (!chat.isActive) {
                this.loadChat(chat.id);
            }
        });

        // Delete button
        div.querySelector('.chat-history-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteChat(chat.id);
        });

        return div;
    }

    /**
     * Load a chat from history
     */
    async loadChat(chatId) {
        // Save current chat if it has messages
        if (this.conversationHistory.length > 0 && this.currentChatId !== chatId) {
            await this.saveCurrentChatToHistory();
        }

        // Find chat in history
        const chat = this.chatHistory.find(c => c.id === chatId);
        if (!chat) return;

        // Remove this chat from history array (it will become the current chat)
        this.chatHistory = this.chatHistory.filter(c => c.id !== chatId);
        await this.cacheManager.setSetting('chatHistory', this.chatHistory);

        // Load chat
        this.currentChatId = chatId;
        this.conversationHistory = chat.messages || [];
        this.chatSpecificKnowledge = chat.documentsScope === 'chat-specific';

        // Update UI
        document.getElementById('chatSpecificKnowledge').checked = this.chatSpecificKnowledge;
        this.chatUI.clearChat();
        
        // Render messages
        this.conversationHistory.forEach(msg => {
            if (msg.role === 'user') {
                this.chatUI.addUserMessage(msg.content);
            } else if (msg.role === 'bot' || msg.role === 'model' || msg.role === 'assistant') {
                this.chatUI.addBotMessage(msg.content);
            }
        });

        // Reload chat history UI
        await this.loadChatHistory();
        this.updateStats();
    }

    /**
     * Delete a chat
     */
    async deleteChat(chatId) {
        if (chatId === this.currentChatId) {
            alert('Cannot delete the current active chat.');
            return;
        }

        if (!confirm('Delete this chat? This action cannot be undone.')) return;

        try {
            // Remove from history array
            this.chatHistory = this.chatHistory.filter(c => c.id !== chatId);
            await this.cacheManager.setSetting('chatHistory', this.chatHistory);

            // Remove from IndexedDB
            await this.cacheManager.deleteConversation(chatId);

            // Reload list
            await this.loadChatHistory();
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Failed to delete chat. Please try again.');
        }
    }

    /**
     * Format timestamp as time ago
     */
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        
        return new Date(timestamp).toLocaleDateString();
    }

    /**
     * Show export menu
     */
    showExportMenu() {
        const choice = confirm('Export as JSON? (OK = JSON, Cancel = Markdown)');
        
        if (choice) {
            this.chatUI.exportChatAsJSON();
        } else {
            this.chatUI.exportChatAsMarkdown();
        }
    }

    /**
     * Clear chat
     */
    async clearChat() {
        if (!confirm('Are you sure you want to clear the chat history?')) return;

        this.chatUI.clearChat();
        this.conversationHistory = [];
        await this.cacheManager.clearAllConversations();
        this.updateStats();
    }

    /**
     * Clear cache
     */
    async clearCache() {
        if (!confirm('Are you sure you want to clear all cache? This will remove all documents and conversations.')) return;

        try {
            await this.cacheManager.clearAllCache();
            await this.ragEngine.clearAll();
            
            // Clear UI
            this.chatUI.clearChat();
            this.conversationHistory = [];
            document.getElementById('documentList').innerHTML = '';
            
            this.updateStats();
            alert('Cache cleared successfully!');
            
            // Reload settings
            this.loadSettings();
        } catch (error) {
            console.error('Clear cache error:', error);
            alert('Failed to clear cache');
        }
    }
}

// Initialize the app when the page loads
const app = new RAGChatbotApp();

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Expose app to window for document list actions
window.app = app;
