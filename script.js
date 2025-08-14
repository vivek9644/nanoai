// 👇 1. यहाँ अपने Render बैकएंड का URL डालें
const BACKEND_URL = "https://backendnano-ai.onrender.com"; // इसे अपने Render URL से बदलें

const chatForm = document.getElementById('chat-form');
const promptInput = document.getElementById('prompt-input');
const chatWindow = document.getElementById('chat-window');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileNameDisplay = document.getElementById('file-name-display');

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    fileNameDisplay.textContent = fileInput.files.length > 0 ? `Selected: ${fileInput.files[0].name}` : '';
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) return;

    const userFile = fileInput.files[0];
    addMessage(userPrompt, 'user');
    promptInput.value = '';
    fileInput.value = ''; // फाइल इनपुट को रीसेट करें
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
            throw new Error(data.error || 'Something went wrong');
        }

        updateMessage(loadingMessage, data.reply);

    } catch (error) {
        console.error('Error:', error);
        updateMessage(loadingMessage, `Error: ${error.message}`);
    }
});

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
    element.innerHTML = ''; // पुराना "सोच रहा हूँ..." हटा दें

    if (newText.includes('```')) {
        const parts = newText.split('```');
        element.innerHTML = parts.map((part, index) => {
            if (index % 2 === 1) {
                const lang = part.split('\n')[0].trim();
                const codeContent = part.substring(part.indexOf('\n') + 1);
                return `<pre><code class="language-${lang}">${escapeHtml(codeContent)}</code></pre>`;
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