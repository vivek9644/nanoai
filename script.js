document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const promptInput = document.getElementById('prompt-input');
    const chatWindow = document.getElementById('chat-window');
    const modelSelector = document.getElementById('model-selector');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.createElement('input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const sendBtn = document.getElementById('send-btn');
    const streamToggle = document.getElementById('stream-toggle');
    
    fileInput.type = 'file';
    fileInput.hidden = true;
    document.body.appendChild(fileInput);
    
    // रेंडर पर डिप्लॉय बैकएंड का URL
    const API_URL = 'https://backendnano-ai.onrender.com';
    
    // Handle file upload
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            const fileSize = (fileInput.files[0].size / 1024 / 1024).toFixed(2); // MB में
            
            // फाइल टाइप आइकन
            let fileIcon = '📄';
            const fileType = fileInput.files[0].type;
            
            if (fileType.includes('image')) fileIcon = '🖼️';
            else if (fileType.includes('pdf')) fileIcon = '📑';
            else if (fileType.includes('zip')) fileIcon = '📦';
            else if (fileType.includes('word')) fileIcon = '📝';
            
            fileNameDisplay.innerHTML = `${fileIcon} <strong>${fileName}</strong> (${fileSize} MB)`;
        } else {
            fileNameDisplay.textContent = '';
        }
    });
    
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = promptInput.value.trim();
        const selectedModel = modelSelector.value;
        const file = fileInput.files[0];
        const useStream = streamToggle.checked;
        
        if (!prompt) return;
        
        // यूजर का मैसेज दिखाएं
        addMessage(prompt, 'user-message');
        promptInput.value = '';
        
        // AI सोच रहा है - टेम्पररी मैसेज
        const thinkingMessage = addMessage('<div class="thinking">AI सोच रहा है<span class="cursor"></span></div>', 'ai-message', true);
        
        // फॉर्म को डिसेबल करें
        sendBtn.disabled = true;
        uploadBtn.disabled = true;
        modelSelector.disabled = true;
        sendBtn.innerHTML = '<span class="send-icon">⏳</span> प्रोसेसिंग...';
        
        try {
            if (useStream && selectedModel === 'openai/gpt-4o') {
                // स्ट्रीमिंग रिस्पॉन्स के लिए
                await handleStreamingResponse(prompt, selectedModel, file, thinkingMessage);
            } else if (selectedModel === 'openai/dalle-3') {
                // इमेज जनरेशन के लिए
                await handleImageGeneration(prompt, selectedModel, thinkingMessage);
            } else {
                // नॉर्मल रिस्पॉन्स के लिए
                await handleNormalResponse(prompt, selectedModel, file, thinkingMessage);
            }
        } catch (error) {
            console.error('Error:', error);
            thinkingMessage.innerHTML = `क्षमा करें, कुछ गलत हो गया। <br><small>${error.message}</small>`;
            thinkingMessage.style.backgroundColor = '#b21f1f';
        } finally {
            // फॉर्म को फिर से सक्षम करें
            sendBtn.disabled = false;
            uploadBtn.disabled = false;
            modelSelector.disabled = false;
            sendBtn.innerHTML = '<span class="send-icon">✉️</span> भेजें';
            fileInput.value = '';
            fileNameDisplay.textContent = '';
        }
    });
    
    async function handleNormalResponse(prompt, model, file, thinkingElement) {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', model);
        if (file) {
            formData.append('file', file);
        }
        
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // मॉडल टैग बनाएं
        const modelTag = document.createElement('div');
        modelTag.className = 'model-tag';
        modelTag.textContent = data.model || model.split('/').pop();
        
        // थिंकिंग मैसेज को अपडेट करें
        thinkingElement.innerHTML = data.response.replace(/\n/g, '<br>');
        thinkingElement.appendChild(modelTag);
    }
    
    async function handleStreamingResponse(prompt, model, file, thinkingElement) {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', model);
        if (file) {
            formData.append('file', file);
        }
        
        const response = await fetch(`${API_URL}/api/chat-stream`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        // मॉडल टैग बनाएं
        const modelTag = document.createElement('div');
        modelTag.className = 'model-tag';
        modelTag.textContent = model.split('/').pop();
        thinkingElement.appendChild(modelTag);
        
        // थिंकिंग इंडिकेटर हटाएं
        thinkingElement.innerHTML = '';
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '');
                    
                    if (dataStr === '[DONE]') {
                        return;
                    }
                    
                    try {
                        const data = JSON.parse(dataStr);
                        if (data.content) {
                            responseText += data.content;
                            thinkingElement.innerHTML = responseText.replace(/\n/g, '<br>');
                            chatWindow.scrollTop = chatWindow.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Error parsing stream data:', e);
                    }
                }
            }
        }
    }
    
    async function handleImageGeneration(prompt, model, thinkingElement) {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', model);
        
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // मॉडल टैग बनाएं
        const modelTag = document.createElement('div');
        modelTag.className = 'model-tag';
        modelTag.textContent = data.model || model.split('/').pop();
        
        // इमेज एलिमेंट बनाएं
        const imageContainer = document.createElement('div');
        imageContainer.style.marginTop = '15px';
        imageContainer.style.textAlign = 'center';
        
        const img = document.createElement('img');
        img.src = data.imageUrl;
        img.alt = prompt;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '10px';
        img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        
        imageContainer.appendChild(img);
        
        // थिंकिंग मैसेज को अपडेट करें
        thinkingElement.innerHTML = `DALL-E 3 द्वारा जनरेट की गई छवि: "${prompt}"`;
        thinkingElement.appendChild(modelTag);
        thinkingElement.appendChild(imageContainer);
    }
    
    function addMessage(content, className, returnElement = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.innerHTML = content;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        if (returnElement) {
            return messageDiv;
        }
    }
});
