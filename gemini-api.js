/**
 * Gemini API Integration Module
 * Handles communication with Google's Gemini API
 */

export class GeminiAPI {
    constructor() {
        this.apiKey = null;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
        this.model = 'gemini-2.5-flash'; // Default to latest stable model
        this.defaultTemperature = 0.7;
        this.apiPlan = 'free'; // 'free' or 'pro'
        
        // Available models by plan (based on official Gemini API docs)
        this.models = {
            free: [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)', description: 'Best price-performance, 0/5 RPM, 0/250K TPM' },
                { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Ultra fast, optimized for cost, 0/10 RPM' },
                { id: 'gemini-3-flash', name: 'Gemini 3 Flash', description: 'Newest flash model with speed, 0/5 RPM' },
                { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Previous generation, 1M context' }
            ],
            pro: [
                { id: 'gemini-3-pro', name: 'Gemini 3 Pro (Recommended)', description: 'Most intelligent multimodal model' },
                { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced thinking model for complex reasoning' },
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Best price-performance' },
                { id: 'gemini-3-flash', name: 'Gemini 3 Flash', description: 'Fast and intelligent' }
            ]
        };
    }

    /**
     * Set the API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey.trim();
    }

    /**
     * Set API plan (free or pro)
     */
    setApiPlan(plan) {
        this.apiPlan = plan;
        // Set default model based on plan
        if (plan === 'free') {
            this.model = 'gemini-2.5-flash';
        } else {
            this.model = 'gemini-3-pro';
        }
    }

    /**
     * Set specific model
     */
    setModel(modelId) {
        this.model = modelId;
    }

    /**
     * Get available models for current plan
     */
    getAvailableModelsForPlan(plan = null) {
        const currentPlan = plan || this.apiPlan;
        return this.models[currentPlan] || this.models.free;
    }

    /**
     * Get current model info
     */
    getCurrentModelInfo() {
        const allModels = [...this.models.free, ...this.models.pro];
        return allModels.find(m => m.id === this.model) || { 
            id: this.model, 
            name: this.model, 
            description: 'Custom model' 
        };
    }

    /**
     * Validate API key by making a test request
     */
    async validateApiKey(apiKey) {
        try {
            const testKey = apiKey || this.apiKey;
            
            if (!testKey) {
                return { valid: false, error: 'API key is required' };
            }

            // Make a simple test request
            const response = await fetch(
                `${this.baseURL}/models/${this.model}:generateContent?key=${testKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: 'Hello' }]
                        }]
                    })
                }
            );

            if (response.ok) {
                return { valid: true };
            } else {
                const error = await response.json();
                return { 
                    valid: false, 
                    error: error.error?.message || 'Invalid API key' 
                };
            }
        } catch (error) {
            console.error('API key validation error:', error);
            return { 
                valid: false, 
                error: 'Failed to validate API key. Check your internet connection.' 
            };
        }
    }

    /**
     * Generate content with RAG context
     */
    async generateResponse(userMessage, conversationHistory, relevantChunks, temperature = null) {
        try {
            if (!this.apiKey) {
                throw new Error('API key not set');
            }

            // Build the prompt with RAG context
            const prompt = this.buildRAGPrompt(userMessage, relevantChunks);

            // Prepare conversation history
            const contents = this.prepareContents(conversationHistory, prompt);

            // Make API request
            const response = await fetch(
                `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: contents,
                        generationConfig: {
                            temperature: temperature || this.defaultTemperature,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        },
                        safetySettings: [
                            {
                                category: 'HARM_CATEGORY_HARASSMENT',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                            },
                            {
                                category: 'HARM_CATEGORY_HATE_SPEECH',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                            },
                            {
                                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                            },
                            {
                                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                            }
                        ]
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API request failed');
            }

            const data = await response.json();
            
            // Extract the response text
            if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                
                if (candidate.content && candidate.content.parts) {
                    const text = candidate.content.parts
                        .map(part => part.text)
                        .join('');
                    
                    return {
                        success: true,
                        text: text,
                        finishReason: candidate.finishReason,
                        usedChunks: relevantChunks.length
                    };
                }
            }

            throw new Error('No response generated');

        } catch (error) {
            console.error('Error generating response:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate streaming response with RAG context
     */
    async *generateStreamingResponse(userMessage, conversationHistory, relevantChunks, temperature = null) {
        try {
            if (!this.apiKey) {
                throw new Error('API key not set');
            }

            // Build the prompt with RAG context
            const prompt = this.buildRAGPrompt(userMessage, relevantChunks);

            // Prepare conversation history
            const contents = this.prepareContents(conversationHistory, prompt);

            // Make streaming API request
            const response = await fetch(
                `${this.baseURL}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: contents,
                        generationConfig: {
                            temperature: temperature || this.defaultTemperature,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        }
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API request failed');
            }

            // Read the streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                // Process complete JSON objects from the stream
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    try {
                        const data = JSON.parse(line);
                        
                        if (data.candidates && data.candidates.length > 0) {
                            const candidate = data.candidates[0];
                            
                            if (candidate.content && candidate.content.parts) {
                                const text = candidate.content.parts
                                    .map(part => part.text)
                                    .join('');
                                
                                yield { text, done: false };
                            }
                        }
                    } catch (e) {
                        // Skip invalid JSON
                        console.warn('Failed to parse streaming chunk:', e);
                    }
                }
            }

            yield { text: '', done: true };

        } catch (error) {
            console.error('Error in streaming response:', error);
            throw error;
        }
    }

    /**
     * Build RAG-enhanced prompt
     */
    buildRAGPrompt(userMessage, relevantChunks) {
        if (!relevantChunks || relevantChunks.length === 0) {
            return userMessage;
        }

        // Build context from relevant chunks
        const contextParts = relevantChunks.map((chunk, index) => 
            `[Document ${index + 1}: ${chunk.docName}]\n${chunk.content}`
        );

        const context = contextParts.join('\n\n---\n\n');

        // Create enhanced prompt
        const enhancedPrompt = `You are a helpful AI assistant. Use the following context from documents to answer the user's question. If the answer cannot be found in the context, say so and provide a general response.

CONTEXT:
${context}

---

USER QUESTION:
${userMessage}

Please provide a comprehensive answer based on the context above. If you reference information from the context, you can mention which document it comes from.`;

        return enhancedPrompt;
    }

    /**
     * Prepare conversation contents for API
     */
    prepareContents(conversationHistory, currentPrompt) {
        const contents = [];

        // Add conversation history (limited to avoid token limits)
        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });
        }

        // Add current prompt
        contents.push({
            role: 'user',
            parts: [{ text: currentPrompt }]
        });

        return contents;
    }

    /**
     * Set default temperature
     */
    setTemperature(temperature) {
        this.defaultTemperature = Math.max(0, Math.min(1, temperature));
    }

    /**
     * Get available models
     */
    async getAvailableModels() {
        try {
            if (!this.apiKey) {
                throw new Error('API key not set');
            }

            const response = await fetch(
                `${this.baseURL}/models?key=${this.apiKey}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }

            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
    }

    /**
     * Count tokens in text (rough estimation)
     */
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }

    /**
     * Check if context fits within token limit
     */
    checkTokenLimit(conversationHistory, relevantChunks, maxTokens = 30000) {
        let totalTokens = 0;

        // Count conversation history tokens
        if (conversationHistory) {
            conversationHistory.forEach(msg => {
                totalTokens += this.estimateTokens(msg.content);
            });
        }

        // Count chunk tokens
        if (relevantChunks) {
            relevantChunks.forEach(chunk => {
                totalTokens += this.estimateTokens(chunk.content);
            });
        }

        return {
            withinLimit: totalTokens < maxTokens,
            estimatedTokens: totalTokens,
            maxTokens: maxTokens
        };
    }

    /**
     * Truncate conversation history to fit token limit
     */
    truncateHistory(conversationHistory, maxMessages = 10) {
        if (!conversationHistory || conversationHistory.length <= maxMessages) {
            return conversationHistory;
        }

        // Keep the most recent messages
        return conversationHistory.slice(-maxMessages);
    }
}
