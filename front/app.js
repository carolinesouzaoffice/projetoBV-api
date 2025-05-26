const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

const API_URL = 'https://projetobv-api.onrender.com/api/perguntar';

let conversationHistory = [];

function addMessage(text, sender, type = '', isMarkdown = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-bubble');

    if (sender === 'user') {
        messageDiv.textContent = text;
    } else {
        if (isMarkdown) {
            messageDiv.innerHTML = marked.parse(text, { gfm: true, breaks: true });
        } else {
            messageDiv.innerHTML = text;
        }
    }

    if (sender === 'user') {
        messageDiv.classList.add('user');
    } else {
        messageDiv.classList.add('bot');
        if (type === 'loading') {
            messageDiv.classList.add('loading');
            messageDiv.id = 'loading-bubble';
        } else if (type === 'error') {
            messageDiv.classList.add('error');
        }
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

async function getBotResponseFromServer(userMessage) {
    const loadingBubble = addMessage("Pró Gimmi está pensando... 🤔", 'bot', 'loading', false);
    sendButton.disabled = true;
    userInput.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pergunta: userMessage,
                historico: conversationHistory
            }),
        });

        if (loadingBubble) {
            loadingBubble.remove();
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ erro: "Erro de comunicação com o servidor." }));
            console.error('Erro da API:', errorData);
            addMessage(`Ops! A Pró Gimmi teve um probleminha para responder: ${errorData.erro || response.statusText}`, 'bot', 'error', false);
            return null;
        }

        const data = await response.json();
        return data.resposta;

    } catch (error) {
        if (loadingBubble) {
            loadingBubble.remove();
        }
        console.error('Erro ao buscar resposta:', error);
        addMessage("Oh, não! Parece que a Pró Gimmi está com dificuldades técnicas para se conectar. 🔌 Tente de novo em um minutinho!", 'bot', 'error', false);
        return null;
    } finally {
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

async function handleSendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    addMessage(messageText, 'user');
    conversationHistory.push({ role: "user", parts: [{text: messageText}] });

    userInput.value = '';

    const botReplyTextRaw = await getBotResponseFromServer(messageText);

    if (botReplyTextRaw) {
        let markdownTextForBot = botReplyTextRaw.replace(/<br\s*\/?>/gi, "\n");
        addMessage(markdownTextForBot, 'bot', '', true);
        conversationHistory.push({ role: "model", parts: [{ text: botReplyTextRaw }] });
    }

    if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
    }
}

sendButton.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});