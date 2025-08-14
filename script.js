// यहाँ अपना Render बैकएंड URL डालें
const BACKEND_URL = "https://backendnano-ai.onrender.com";

// DOM एलिमेंट्स
const chatForm = document.getElementById('chat-form');
const promptInput = document.getElementById('prompt-input');
const chatWindow = document.getElementById('chat-window');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileNameDisplay = document.getElementById('file-name-display');
const submitBtn = chatForm.querySelector('button[type="submit"]');

// इवेंट लिस्नर्स
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = `चयनित फाइल: ${fileInput.files[0].name}`;
    } else {
        fileNameDisplay.textContent = '';
    }
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userPrompt = promptInput.value.trim();
    const userFile = fileInput.files[0];
    
    if (!userPrompt) return;
    
    // फॉर्म को अस्थायी रूप से अक्षम करें
    setFormDisabled(true);
    
    // यूजर का मैसेज दिखाएं
    addMessage(`${userPrompt}${userFile ? `\n(फाइल: ${userFile.name})` : ''}`, 'user');
    
    // इनपुट रीसेट करें
    promptInput.value = '';
    fileInput.value = '';
    fileNameDisplay.textContent = '';
    
    // AI के जवाब के लिए लोडिंग संदेश दिखाएं
    const aiMessageElement = addMessage('सोच रहा हूँ...', 'ai', true);
    
    try {
        // फॉर्म डेटा तैयार करें
        const formData = new FormData();
        formData.append('prompt', userPrompt);
        if (userFile) formData.append('file', userFile);
        
        // बैकएंड को रिक्वेस्ट भेजें
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`सर्वर त्रुटि: ${response.status}`);
        }
        
        // स्ट्रीमिंग रिस्पॉन्स को हैंडल करें
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('data: ');
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.includes('[DONE]')) break;
                
                try {
                    const data = JSON.parse(line);
                    if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                        aiResponse += data.choices[0].delta.content;
                        updateMessage(aiMessageElement, aiResponse);
                    }
                } catch (e) {
                    console.warn('JSON पार्सिंग त्रुटि:', e);
                }
            }
        }
        
        // अंतिम अपडेट
        updateMessage(aiMessageElement, aiResponse, false, true);
        
    } catch (error) {
        // त्रुटि हैंडलिंग
        updateMessage(aiMessageElement, `त्रुटि: ${error.message}`, false, true);
        console.error('त्रुटि:', error);
    } finally {
        // फॉर्म को फिर से सक्षम करें
        setFormDisabled(false);
    }
});

// हेल्पर फंक्शन्स
function setFormDisabled(disabled) {
    promptInput.disabled = disabled;
    uploadBtn.disabled = disabled;
    submitBtn.disabled = disabled;
    submitBtn.textContent = disabled ? 'प्रोसेसिंग...' : 'भेजें';
}

function addMessage(text, sender, isThinking = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    
    if (isThinking) {
        messageElement.classList.add('thinking');
        messageElement.innerHTML = text + '<span class="cursor"></span>';
    } else {
        messageElement.textContent = text;
    }
    
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return messageElement;
}

function updateMessage(element, newText, isThinking = false, isFinal = false) {
    if (isFinal) {
        element.classList.remove('thinking');
    } else if (isThinking) {
        element.classList.add('thinking');
    }
    
    element.innerHTML = isThinking 
        ? newText + '<span class="cursor"></span>'
        : newText;
    
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
