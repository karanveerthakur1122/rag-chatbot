# 🤖 RAG Chatbot - Gemini Powered

A sophisticated **Retrieval-Augmented Generation (RAG)** chatbot built with vanilla JavaScript and powered by Google's Gemini API. Upload documents, chat intelligently, and manage conversations with a clean, modern UI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow.svg)
![Gemini](https://img.shields.io/badge/API-Gemini-brightgreen.svg)

---

## ✨ Features

### 🧠 **Smart RAG System**
- **Document Upload**: Support for TXT, PDF, and Markdown files
- **Client-Side Processing**: Text extraction and chunking done locally
- **TF-IDF Retrieval**: Intelligent semantic search for relevant context
- **Configurable Chunking**: Adjust chunk size and overlap for optimal results

### 💬 **Advanced Chat Management**
- **Persistent Chat History**: Automatically saves all conversations
- **Multiple Sessions**: Switch between different chat sessions seamlessly
- **Chat-Specific or Global Knowledge**: Choose per-chat or shared document scope
- **Auto-Generated Titles**: Chat titles from first user message

### 📚 **Knowledge Base**
- **Global Mode** (Default): All chats share the same documents
- **Per-Chat Mode**: Each chat has its own isolated knowledge base
- **Document Management**: Upload, view, and delete documents easily
- **Statistics**: Track documents, chunks, and character counts

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Font Awesome Icons**: Clean, professional icon set
- **Markdown Support**: Full markdown rendering with syntax highlighting
- **Code Highlighting**: Syntax highlighting for 180+ languages
- **Export Options**: Export chats as JSON or Markdown

### ⚙️ **Customizable Settings**
- **Multiple Models**: Choose from Gemini Flash, Pro, and experimental models
- **Temperature Control**: Adjust creativity vs. accuracy
- **Chunk Configuration**: Fine-tune RAG performance
- **API Plan Selection**: Free or Pro tier support

### 💾 **Local-First Storage**
- **IndexedDB**: Store documents, chunks, and conversations locally
- **LocalStorage**: Cache settings and API key
- **No Server Required**: 100% client-side application
- **Privacy-Focused**: Your data never leaves your browser

---

## 🚀 Quick Start

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A Google Gemini API key ([Get one free](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/karanveerthakur1122/rag-chatbot.git
   cd rag-chatbot
   ```

2. **Open in browser:**
   ```bash
   # Simply open index.html in your browser
   # Or use a local server:
   python -m http.server 8000
   # Then visit: http://localhost:8000
   ```

3. **Enter your API key:**
   - On first launch, you'll be prompted for your Gemini API key
   - Get your free key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - The key is stored locally and never shared

4. **Start chatting!**
   - Upload documents via the Knowledge Base button
   - Ask questions about your documents
   - Create new chats and switch between them

---

## 📖 Usage Guide

### Uploading Documents
1. Click **"Knowledge Base"** in the left sidebar
2. Drag & drop files or click to upload (TXT, PDF, MD)
3. Or paste text directly into the text area
4. Documents are processed and chunked automatically

### Managing Chats
- **New Chat**: Click the `+` button to start a fresh conversation
- **Switch Chats**: Click any saved chat to load it
- **Delete Chats**: Hover over a chat and click the trash icon
- **Current Chat**: Always shown at the top with "Just now" timestamp

### Knowledge Base Modes
- **Global (Default)**: All chats access the same documents
- **Per-Chat**: Enable "Use chat-specific knowledge base" for isolated document sets
- Toggle in the Knowledge Base modal

### Adjusting Settings
1. Click the **Settings** icon (⚙️) in the header
2. Customize:
   - API plan (Free/Pro)
   - Model selection
   - Chunk size and overlap
   - Context window size
   - Temperature (creativity)

### Exporting Chats
- Click the **Export** icon (↓) in the header
- Choose JSON (structured data) or Markdown (readable format)
- Save your conversations for backup or sharing

---

## 🏗️ Architecture

### File Structure
```
rag-chatbot/
├── index.html           # Main HTML structure
├── styles.css           # All styles and responsive design
├── app.js              # Main application orchestrator
├── cache-manager.js     # LocalStorage & IndexedDB manager
├── rag-engine.js        # Document processing & retrieval
├── gemini-api.js        # Gemini API integration
├── chat-ui.js           # UI rendering & interactions
└── README.md           # This file
```

### Technology Stack
- **Frontend**: Pure HTML5, CSS3, ES6+ JavaScript
- **API**: Google Gemini API (v1beta)
- **Storage**: IndexedDB + LocalStorage
- **Libraries**:
  - [Marked.js](https://marked.js.org/) - Markdown parsing
  - [Highlight.js](https://highlightjs.org/) - Syntax highlighting
  - [PDF.js](https://mozilla.github.io/pdf.js/) - PDF text extraction
  - [Font Awesome](https://fontawesome.com/) - Icons

### RAG Pipeline
1. **Document Upload** → Text extraction (PDF.js for PDFs)
2. **Text Chunking** → Split into overlapping chunks (600 chars, 100 overlap)
3. **TF-IDF Indexing** → Calculate term frequency scores
4. **Query Processing** → User asks a question
5. **Retrieval** → Find top-K relevant chunks (default: 3)
6. **Context Building** → Combine chunks with conversation history
7. **Generation** → Send to Gemini API for response
8. **Rendering** → Display with markdown and code highlighting

---

## ⚙️ Configuration

### Default Settings
```javascript
{
  chunkSize: 600,           // Characters per chunk
  chunkOverlap: 100,        // Overlap between chunks
  maxContext: 10,           // Max conversation messages to include
  topKChunks: 3,            // Number of relevant chunks to retrieve
  temperature: 0.7,         // Model creativity (0.0 - 1.0)
  apiPlan: 'free',          // 'free' or 'pro'
  model: 'gemini-2.5-flash' // Default model
}
```

### Available Models

**Free Tier:**
- `gemini-2.5-flash` - Fast, efficient, recommended
- `gemini-2.5-flash-lite` - Lighter version
- `gemini-3-flash` - Latest generation

**Pro Tier:**
- `gemini-3-pro` - Most capable
- `gemini-2.5-pro` - Previous generation pro

---

## 🔒 Privacy & Security

- ✅ **No Server**: All processing happens in your browser
- ✅ **Local Storage**: Documents and chats stored locally via IndexedDB
- ✅ **API Key Security**: Stored in localStorage, never transmitted except to Gemini API
- ✅ **No Tracking**: No analytics, no cookies, no external tracking
- ⚠️ **API Key**: Only sent to Google's Gemini API for generation requests

---

## 🐛 Troubleshooting

### "Failed to generate response: The model is overloaded"
- **Cause**: Gemini API free tier is experiencing high traffic
- **Solution**: Wait 1-2 minutes and try again, or switch to a different model

### API Key Not Saving
- **Cause**: Browser blocking localStorage
- **Solution**: Check browser privacy settings, allow localStorage for this site

### Documents Not Uploading
- **Cause**: File might be corrupted or too large
- **Solution**: Try smaller files (<10MB), ensure PDFs are not password-protected

### Chat History Not Loading
- **Cause**: IndexedDB initialization failed
- **Solution**: Clear browser cache and reload, or try a different browser

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) for the powerful LLM API
- [Marked.js](https://marked.js.org/) for markdown parsing
- [Highlight.js](https://highlightjs.org/) for code syntax highlighting
- [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla for PDF processing
- [Font Awesome](https://fontawesome.com/) for beautiful icons

---

## 📧 Contact

For questions, issues, or suggestions:
- Open an issue on GitHub
- Email: codewithkaranveer@gmail.com

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

---
