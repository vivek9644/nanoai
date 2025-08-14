// 👇 1. यहाँ अपने Render बैकएंड का URL डालें
const BACKEND_URL = "https://backendnano-ai.onrender.com"; // इसे अपने Render URL से बदलें

const chatForm = document.getElementById('chat-form');
const promptInput = document.getElementById('prompt-input');
const chatWindow = document.getElementById('chat-window');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileNameDisplay = document.getElementById('file-name-display');
const submitBtn = chatForm.querySelector('button[type="submit"]');

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    fileNameDisplay.textContent = fileInput.files.length > 0 ? `Selected: ${fileInput.files[0].name}` : '';
});

chatForm.addEventListener('submit', async (e) => {
    // उपयोगकर्ता का सुझाव: preventDefault को सबसे ऊपर रखना
    e.preventDefault(); 
    
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) return;

    // प्रोसेसिंग के दौरान फॉर्म को डिसेबल करें
    setFormDisabled(true);

    const userFile = fileInput.files[0];
    addMessage(`${userPrompt}${userFile ? `\n(File: ${userFile.name})` : ''}`, 'user');
    promptInput.value = '';
    fileInput.value = '';
    fileNameDisplay.textContent = '';

    const loadingMessage = addMessage('सोच रहा हूँ...', 'ai', true);

    const formData = new FormData();
    formData.append('prompt', userPrompt);
    if (userFile) {
        formData.append('file', userFile);
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            // बेहतर एरर मैसेज को सीधे दिखाएं
            throw new Error(data.error || 'An unknown network error occurred');
        }

        updateMessage(loadingMessage, data.reply);

    } catch (error) {
        console.error('Frontend Error:', error);
        updateMessage(loadingMessage, `😔 क्षमा करें, एक त्रुटि हुई: ${error.message}`);
    } finally {
        // प्रोसेसिंग पूरी होने पर फॉर्म को फिर से इनेबल करें
        setFormDisabled(false);
    }
});

function setFormDisabled(disabled) {
    promptInput.disabled = disabled;
    uploadBtn.disabled = disabled;
    submitBtn.disabled = disabled;
    submitBtn.textContent = disabled ? "Wait..." : "भेजें";
}

function addMessage(text, sender, isLoading = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    if (isLoading) {
        messageElement.classList.add('loading');
    }
    messageElement.textContent = text;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageElement;
}

function updateMessage(element, newText) {
    element.classList.remove('loading');
    element.innerHTML = ''; // पुराना टेक्स्ट हटा दें

    if (newText.includes('```')) {
        const parts = newText.split(/```/g);
        element.innerHTML = parts.map((part, index) => {
            if (index % 2 === 1) {
                const codeContent = part.substring(part.indexOf('\n') + 1);
                return `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
            } else {
                return escapeHtml(part).replace(/\n/g, '<br>');
            }
        }).join('');
    } else {
        element.textContent = newText;
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
