const chatForm = document.getElementById('chat-form');
const promptInput = document.getElementById('prompt-input');
const chatWindow = document.getElementById('chat-window');

// सर्वर का URL
const API_URL = 'http://localhost:3000/api/chat';

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // फॉर्म को सबमिट होने से रोकें

    const userPrompt = promptInput.value.trim();
    if (!userPrompt) return;

    // यूजर का मेसेज दिखाएँ
    addMessage(userPrompt, 'user');

    // इनपुट फील्ड को खाली करें
    promptInput.value = '';

    try {
        // लोडिंग मेसेज दिखाएँ
        const loadingMessage = addMessage('सोच रहा हूँ...', 'ai');

        // बैकएंड को रिक्वेस्ट भेजें
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: userPrompt }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        const aiReply = data.reply;

        // लोडिंग मेसेज को AI के जवाब से बदलें
        updateMessage(loadingMessage, aiReply);

    } catch (error) {
        console.error('Error:', error);
        addMessage('कुछ गड़बड़ हो गयी। कृपया बाद में प्रयास करें।', 'ai');
    }
});

function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    
    // अगर AI का मेसेज है और उसमें कोड है, तो उसे <pre><code> में डालें
    if (sender === 'ai' && text.includes('```')) {
        const parts = text.split('```');
        messageElement.innerHTML = parts.map((part, index) => {
            if (index % 2 === 1) { // कोड वाला हिस्सा
                const codeContent = part.split('\n').slice(1).join('\n'); // पहली लाइन (जैसे python) हटा दें
                return `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
            } else {
                return escapeHtml(part);
            }
        }).join('');
    } else {
        messageElement.textContent = text;
    }
    
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight; // स्क्रॉल करके नीचे ले जाएँ
    return messageElement;
}

function updateMessage(element, newText) {
    element.innerHTML = ''; // पुराना "सोच रहा हूँ..." हटा दें
    if (newText.includes('```')) {
        const parts = newText.split('```');
        element.innerHTML = parts.map((part, index) => {
            if (index % 2 === 1) {
                const codeContent = part.split('\n').slice(1).join('\n');
                return `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
            } else {
                return escapeHtml(part);
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