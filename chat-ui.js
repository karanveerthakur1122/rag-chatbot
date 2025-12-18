/**
 * Chat UI Manager
 * Handles message rendering, markdown parsing, and UI interactions
 */

export class ChatUI {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.messageCount = 0;

        // Configure marked.js for markdown rendering
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (err) {
                            console.error('Highlight error:', err);
                        }
                    }
                    return hljs.highlightAuto(code).value;
                },
                breaks: true,
                gfm: true
            });
        }
    }

    /**
     * Initialize UI event listeners
     */
    init() {
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });

        // Enter to send, Ctrl+Enter for new line
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                this.sendBtn.click();
            }
        });

        // Allow Ctrl+Enter for multi-line
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                // Allow Ctrl+Enter for new line - browser handles it naturally
            }
        });
    }

    /**
     * Auto-resize textarea based on content
     */
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    /**
     * Add a user message to the chat
     */
    addUserMessage(text) {
        const messageDiv = this.createMessageElement('user', text);
        this.appendMessage(messageDiv);
        this.messageCount++;
        return messageDiv;
    }

    /**
     * Add a bot message to the chat
     */
    addBotMessage(text, isMarkdown = true) {
        const messageDiv = this.createMessageElement('bot', text, isMarkdown);
        this.appendMessage(messageDiv);
        this.messageCount++;
        return messageDiv;
    }

    /**
     * Create a message element
     */
    createMessageElement(role, text, isMarkdown = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        if (isMarkdown && typeof marked !== 'undefined') {
            // Render markdown
            textDiv.innerHTML = marked.parse(text);
        } else {
            // Plain text with line breaks
            textDiv.textContent = text;
        }
        
        contentDiv.appendChild(textDiv);
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = this.getTimestamp();
        contentDiv.appendChild(timestamp);
        
        messageDiv.appendChild(contentDiv);
        
        return messageDiv;
    }

    /**
     * Append message to chat and scroll
     */
    appendMessage(messageElement) {
        // Remove welcome message if it exists
        const welcomeMsg = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    /**
     * Update an existing message (for streaming)
     */
    updateMessage(messageElement, text, isMarkdown = true) {
        const textDiv = messageElement.querySelector('.message-text');
        
        if (isMarkdown && typeof marked !== 'undefined') {
            textDiv.innerHTML = marked.parse(text);
        } else {
            textDiv.textContent = text;
        }
        
        this.scrollToBottom();
    }

    /**
     * Add a streaming bot message that can be updated
     */
    addStreamingBotMessage() {
        const messageDiv = this.createMessageElement('bot', '');
        this.appendMessage(messageDiv);
        return messageDiv;
    }

    /**
     * Update streaming message incrementally
     */
    updateStreamingMessage(messageElement, fullText) {
        this.updateMessage(messageElement, fullText, true);
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        this.typingIndicator.classList.add('hidden');
    }

    /**
     * Clear chat messages
     */
    clearChat() {
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <h2><i class="fas fa-hand-sparkles"></i> Welcome to RAG Chatbot!</h2>
                <p>Upload documents or paste text to build your knowledge base, then ask questions about them.</p>
                <div class="feature-list">
                    <div class="feature"><i class="fas fa-magic"></i> Smart document retrieval</div>
                    <div class="feature"><i class="fas fa-database"></i> Local caching</div>
                    <div class="feature"><i class="fas fa-code"></i> Markdown & code support</div>
                    <div class="feature"><i class="fas fa-brain"></i> AI-powered responses</div>
                </div>
            </div>
        `;
        this.messageCount = 0;
    }

    /**
     * Scroll to bottom of chat
     */
    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    /**
     * Get current timestamp
     */
    getTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Get message input value
     */
    getMessageInput() {
        return this.messageInput.value.trim();
    }

    /**
     * Clear message input
     */
    clearMessageInput() {
        this.messageInput.value = '';
        this.autoResizeTextarea();
    }

    /**
     * Disable input
     */
    disableInput() {
        this.messageInput.disabled = true;
        this.sendBtn.disabled = true;
    }

    /**
     * Enable input
     */
    enableInput() {
        this.messageInput.disabled = false;
        this.sendBtn.disabled = false;
        this.messageInput.focus();
    }

    /**
     * Export chat as JSON
     */
    exportChatAsJSON() {
        const messages = [];
        const messageElements = this.chatMessages.querySelectorAll('.message');
        
        messageElements.forEach(msgEl => {
            const role = msgEl.classList.contains('user') ? 'user' : 'bot';
            const text = msgEl.querySelector('.message-text').textContent;
            const timestamp = msgEl.querySelector('.message-timestamp').textContent;
            
            messages.push({ role, text, timestamp });
        });

        const data = {
            exportDate: new Date().toISOString(),
            messageCount: messages.length,
            messages: messages
        };

        this.downloadFile(
            JSON.stringify(data, null, 2),
            'chat-export.json',
            'application/json'
        );
    }

    /**
     * Export chat as Markdown
     */
    exportChatAsMarkdown() {
        let markdown = `# Chat Export\n\n`;
        markdown += `**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;
        
        const messageElements = this.chatMessages.querySelectorAll('.message');
        
        messageElements.forEach(msgEl => {
            const role = msgEl.classList.contains('user') ? 'User' : 'Assistant';
            const text = msgEl.querySelector('.message-text').textContent;
            const timestamp = msgEl.querySelector('.message-timestamp').textContent;
            
            markdown += `### ${role} (${timestamp})\n\n`;
            markdown += `${text}\n\n---\n\n`;
        });

        this.downloadFile(
            markdown,
            'chat-export.md',
            'text/markdown'
        );
    }

    /**
     * Download file helper
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Show error message in chat
     */
    showError(errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message bot';
        errorDiv.innerHTML = `
            <div class="message-content" style="background-color: var(--danger); color: white;">
                <div class="message-text">
                    <strong><i class="fas fa-exclamation-circle"></i> Error:</strong> ${errorMessage}
                </div>
            </div>
        `;
        this.appendMessage(errorDiv);
    }

    /**
     * Show info message in chat
     */
    showInfo(infoMessage) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'message bot';
        infoDiv.innerHTML = `
            <div class="message-content" style="background-color: var(--info); color: white;">
                <div class="message-text">
                    <strong><i class="fas fa-info-circle"></i> Info:</strong> ${infoMessage}
                </div>
            </div>
        `;
        this.appendMessage(infoDiv);
    }

    /**
     * Get message count
     */
    getMessageCount() {
        return this.messageCount;
    }

    /**
     * Get all messages for history
     */
    getAllMessages() {
        const messages = [];
        const messageElements = this.chatMessages.querySelectorAll('.message');
        
        messageElements.forEach(msgEl => {
            const role = msgEl.classList.contains('user') ? 'user' : 'bot';
            const text = msgEl.querySelector('.message-text').textContent;
            
            messages.push({ role, content: text });
        });

        return messages;
    }

    /**
     * Add system message (for RAG context info)
     */
    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.innerHTML = `
            <div class="message-content" style="background-color: var(--bg-tertiary); border-left: 3px solid var(--accent-primary);">
                <div class="message-text" style="font-size: 0.875rem; color: var(--text-secondary);">
                    <i class="fas fa-info-circle"></i> ${text}
                </div>
            </div>
        `;
        this.appendMessage(messageDiv);
    }
}
