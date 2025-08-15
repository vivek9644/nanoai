document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const promptInput = document.getElementById('prompt-input');
    const chatWindow = document.getElementById('chat-window');
    const modelSelector = document.getElementById('model-selector');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const sendBtn = document.getElementById('send-btn');

    const API_URL = 'https://backendnano-ai.onrender.com'; // <<--- अपनी रेंडर URL यहाँ डालें

    // Handle file upload button click
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Display file name when selected
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = `Attached: ${fileInput.files[0].name}`;
        } else {
            fileNameDisplay.textContent = '';
        }
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = promptInput.value.trim();
        const selectedModel = modelSelector.value;
        const file = fileInput.files[0];

        if (!prompt) return;

        // Display user message
        addMessage(prompt, 'user-message');
        promptInput.value = '';
        fileNameDisplay.textContent = ''; // Clear file name after sending
        
        // Disable form while waiting for response
        sendBtn.disabled = true;
        sendBtn.textContent = 'सोच रहा है...';

        // Add a temporary "thinking" message
        const thinkingMessage = addMessage('<div class="thinking">AI सोच रहा है<span class="cursor"></span></div>', 'ai-message', true);

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', selectedModel);
        if (file) {
            formData.append('file', file);
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData, // No 'Content-Type' header needed, browser sets it for FormData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // Update the thinking message with the actual response
            thinkingMessage.innerHTML = data.response.replace(/\n/g, '<br>');

        } catch (error) {
            console.error('Error:', error);
            thinkingMessage.innerHTML = `क्षमा करें, कुछ गलत हो गया। <br><small>${error.message}</small>`;
            thinkingMessage.style.backgroundColor = '#b21f1f';
        } finally {
            // Re-enable form
            sendBtn.disabled = false;
            sendBtn.textContent = 'भेजें';
            fileInput.value = ''; // Reset file input
        }
    });

    function addMessage(content, className, returnElement = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.innerHTML = content;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
        if (returnElement) {
            return messageDiv;
        }
    }
});
