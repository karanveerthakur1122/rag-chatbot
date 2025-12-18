/**
 * RAG Engine - Document Processing and Retrieval Module
 * Handles document chunking, TF-IDF scoring, and semantic search
 */

export class RAGEngine {
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
        this.documents = new Map();
        this.chunks = [];
        this.chunkSize = 600; // Default characters per chunk
        this.chunkOverlap = 100; // Default overlap
    }

    /**
     * Update chunking configuration
     */
    updateConfig(chunkSize, chunkOverlap) {
        this.chunkSize = chunkSize;
        this.chunkOverlap = chunkOverlap;
    }

    /**
     * Process and add a document to the knowledge base
     */
    async addDocument(fileName, content, chatId = 'global') {
        try {
            const docId = this.generateDocId(fileName);
            
            // Create document metadata
            const document = {
                id: docId,
                name: fileName,
                content: content,
                addedAt: new Date().toISOString(),
                chunkCount: 0,
                chatId: chatId  // Add chat scope
            };

            // Chunk the document
            const chunks = this.chunkDocument(content, docId, fileName);
            document.chunkCount = chunks.length;

            // Store document and chunks
            this.documents.set(docId, document);
            this.chunks.push(...chunks);

            // Save to cache
            await this.cacheManager.saveDocument(document);
            await this.cacheManager.saveChunks(chunks);

            return { success: true, docId, chunkCount: chunks.length };
        } catch (error) {
            console.error('Error adding document:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove a document from the knowledge base
     */
    async removeDocument(docId) {
        try {
            // Remove chunks associated with this document
            this.chunks = this.chunks.filter(chunk => chunk.docId !== docId);
            
            // Remove document
            this.documents.delete(docId);

            // Update cache
            await this.cacheManager.deleteDocument(docId);
            await this.cacheManager.deleteChunksByDocId(docId);

            return { success: true };
        } catch (error) {
            console.error('Error removing document:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load all documents and chunks from cache
     */
    async loadFromCache() {
        try {
            const cachedDocs = await this.cacheManager.getAllDocuments();
            const cachedChunks = await this.cacheManager.getAllChunks();

            // Restore documents
            cachedDocs.forEach(doc => {
                this.documents.set(doc.id, doc);
            });

            // Restore chunks
            this.chunks = cachedChunks;

            return { 
                success: true, 
                documentCount: this.documents.size, 
                chunkCount: this.chunks.length 
            };
        } catch (error) {
            console.error('Error loading from cache:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Chunk a document into smaller pieces
     */
    chunkDocument(content, docId, fileName) {
        const chunks = [];
        const lines = content.split('\n');
        let currentChunk = '';
        let chunkIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (currentChunk.length + line.length > this.chunkSize && currentChunk.length > 0) {
                // Save current chunk
                chunks.push(this.createChunk(currentChunk, docId, fileName, chunkIndex));
                chunkIndex++;

                // Start new chunk with overlap
                const words = currentChunk.split(' ');
                const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 5)); // Approximate word count
                currentChunk = overlapWords.join(' ') + '\n' + line;
            } else {
                currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
            }
        }

        // Add final chunk
        if (currentChunk.length > 0) {
            chunks.push(this.createChunk(currentChunk, docId, fileName, chunkIndex));
        }

        return chunks;
    }

    /**
     * Create a chunk object with metadata
     */
    createChunk(content, docId, fileName, index) {
        return {
            id: `${docId}_chunk_${index}`,
            docId: docId,
            docName: fileName,
            content: content.trim(),
            index: index,
            tokens: this.tokenize(content),
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Retrieve relevant chunks for a query using TF-IDF scoring
     */
    retrieveRelevantChunks(query, topK = 3) {
        if (this.chunks.length === 0) {
            return [];
        }

        const queryTokens = this.tokenize(query);
        
        // Calculate relevance scores
        const scoredChunks = this.chunks.map(chunk => {
            const score = this.calculateRelevanceScore(queryTokens, chunk.tokens);
            return { chunk, score };
        });

        // Sort by score and return top K
        scoredChunks.sort((a, b) => b.score - a.score);
        
        return scoredChunks
            .slice(0, topK)
            .filter(item => item.score > 0) // Only return chunks with relevance
            .map(item => ({
                content: item.chunk.content,
                docName: item.chunk.docName,
                score: item.score,
                chunkId: item.chunk.id
            }));
    }

    /**
     * Calculate relevance score using TF-IDF-like approach
     */
    calculateRelevanceScore(queryTokens, chunkTokens) {
        if (queryTokens.length === 0 || chunkTokens.length === 0) {
            return 0;
        }

        let score = 0;
        const chunkTokenSet = new Set(chunkTokens);
        
        // Calculate term frequency
        queryTokens.forEach(token => {
            if (chunkTokenSet.has(token)) {
                // TF: frequency of term in chunk
                const tf = chunkTokens.filter(t => t === token).length / chunkTokens.length;
                
                // IDF: inverse document frequency (how rare the term is)
                const docsWithTerm = this.chunks.filter(chunk => 
                    chunk.tokens.includes(token)
                ).length;
                const idf = Math.log(this.chunks.length / (docsWithTerm + 1));
                
                score += tf * idf;
            }
        });

        // Normalize by query length
        return score / Math.sqrt(queryTokens.length);
    }

    /**
     * Tokenize text into searchable terms
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(token => token.length > 2) // Filter short words
            .filter(token => !this.isStopWord(token)); // Filter stop words
    }

    /**
     * Check if a word is a stop word
     */
    isStopWord(word) {
        const stopWords = new Set([
            'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
            'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
            'it', 'from', 'be', 'are', 'was', 'were', 'been', 'have', 'has',
            'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        ]);
        return stopWords.has(word);
    }

    /**
     * Generate a unique document ID
     */
    generateDocId(fileName) {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all documents
     */
    getAllDocuments() {
        return Array.from(this.documents.values());
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            documentCount: this.documents.size,
            chunkCount: this.chunks.length,
            totalSize: Array.from(this.documents.values())
                .reduce((sum, doc) => sum + doc.content.length, 0)
        };
    }

    /**
     * Clear all documents and chunks
     */
    async clearAll() {
        this.documents.clear();
        this.chunks = [];
        await this.cacheManager.clearAllDocuments();
        await this.cacheManager.clearAllChunks();
    }

    /**
     * Extract text from file based on type
     */
    async extractTextFromFile(file) {
        const fileType = file.name.split('.').pop().toLowerCase();

        try {
            if (fileType === 'txt' || fileType === 'md') {
                return await this.readTextFile(file);
            } else if (fileType === 'pdf') {
                return await this.extractTextFromPDF(file);
            } else {
                throw new Error(`Unsupported file type: ${fileType}`);
            }
        } catch (error) {
            console.error('Error extracting text from file:', error);
            throw error;
        }
    }

    /**
     * Read text file
     */
    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Extract text from PDF using pdf.js
     */
    async extractTextFromPDF(file) {
        try {
            // Load PDF.js library
            const pdfjsLib = window['pdfjs-dist/build/pdf'];
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            
            // Extract text from each page
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }

            return fullText.trim();
        } catch (error) {
            console.error('Error extracting PDF text:', error);
            throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.');
        }
    }

    /**
     * Search documents by name
     */
    searchDocuments(searchTerm) {
        const term = searchTerm.toLowerCase();
        return Array.from(this.documents.values()).filter(doc =>
            doc.name.toLowerCase().includes(term)
        );
    }
}
