document.addEventListener('DOMContentLoaded', function() {
    checkBothKeys();
    // Make sure the play button is always visible
    document.getElementById('playButton').style.display = 'block';
});

document.getElementById('apiKeyForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const apiKey = document.getElementById('apiKey').value;
    localStorage.setItem('apiKey', apiKey);
    alert('ElevenLabs API Key saved securely!');
    checkBothKeys();
});

document.getElementById('openAiKeyForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const openAiKey = document.getElementById('openAiKey').value;
    localStorage.setItem('openAiKey', openAiKey);
    alert('OpenAI API Key saved securely!');
    checkBothKeys();
});

document.getElementById('changeApiKeysButton').addEventListener('click', function() {
    toggleApiKeysForm(true);
});

document.getElementById('playButton').addEventListener('click', function() {
    const audioOutput = document.getElementById('audioOutput');
    if (audioOutput.src) {
        audioOutput.play();
    } else {
        alert('No audio available to play.');
    }
});

function toggleApiKeysForm(show) {
    const apiKeyForm = document.getElementById('apiKeyForm');
    const openAiKeyForm = document.getElementById('openAiKeyForm');
    const changeApiKeysButton = document.getElementById('changeApiKeysButton');

    if (show) {
        apiKeyForm.style.display = 'block';
        openAiKeyForm.style.display = 'block';
        changeApiKeysButton.style.display = 'none';
    } else {
        apiKeyForm.style.display = 'none';
        openAiKeyForm.style.display = 'none';
        changeApiKeysButton.style.display = 'block';
    }
}

function checkBothKeys() {
    const apiKey = localStorage.getItem('apiKey');
    const openAiKey = localStorage.getItem('openAiKey');
    const changeApiKeysButton = document.getElementById('changeApiKeysButton');

    if (apiKey) {
        document.getElementById('apiKey').value = apiKey;
        document.getElementById('apiKey').disabled = true;
        document.querySelector('#apiKeyForm button').innerText = 'API Key Saved';
        document.querySelector('#apiKeyForm button').disabled = true;
    }
    if (openAiKey) {
        document.getElementById('openAiKey').value = openAiKey;
        document.getElementById('openAiKey').disabled = true;
        document.querySelector('#openAiKeyForm button').innerText = 'API Key Saved';
        document.querySelector('#openAiKeyForm button').disabled = true;
    }
    if (apiKey && openAiKey) {
        document.getElementById('apiInteraction').style.display = 'block';
        toggleApiKeysForm(false);
    } else {
        toggleApiKeysForm(true);
    }
}

document.getElementById('translateButton').addEventListener('click', function() {
    handleAction('translate');
});

document.getElementById('generateButton').addEventListener('click', function() {
    handleAction('generate');
});

async function handleAction(actionType) {
    const apiKey = localStorage.getItem('apiKey');
    const openAiKey = localStorage.getItem('openAiKey');
    const textToConvert = document.getElementById('textToConvert').value;
    const progressBar = document.getElementById('progressBar');
    const progressBarInner = document.querySelector('.progress-bar-inner');
    const textOutput = document.getElementById('textOutput');

    if (!apiKey || !openAiKey) {
        alert('Please enter both API keys first.');
        return;
    }

    let translatedText = "";

    // Show progress bar
    progressBar.style.display = 'block';
    progressBarInner.style.width = '10%';

    // Call OpenAI API to translate or generate response in Greek
    try {
        const prompt = actionType === 'translate' 
            ? `Translate the following text to Greek: ${textToConvert}`
            : `The user is asking a question in any language and you provide the response in Greek: ${textToConvert}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a helpful assistant that speaks Greek. You provide only the greek response and only in plaintext with no formatting and neither breaks. You just provide a single block of text. DO NOT PROVIDE A LIST. I WANT ONLY A SINGLE CONTINOUS BLOCK OF TEXT FROM YOU." },
                    { role: "user", content: prompt }
                ],
                stream: true  // Enable streaming
            })
        });

        if (response.ok) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            progressBarInner.style.width = '50%';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                // Process chunk to extract the streamed text
                const regex = /"delta":{"content":"(.*?)"}/g;
                let match;
                while ((match = regex.exec(chunk)) !== null) {
                    translatedText += match[1];
                    textOutput.innerText = translatedText;
                }
            }
        } else {
            throw new Error('Failed to get a response from OpenAI');
        }

    } catch (error) {
        console.error('Error with OpenAI API:', error);
        alert('Failed to get a response from OpenAI');
        progressBar.style.display = 'none';
        return;
    }

    // Call ElevenLabs API to convert the translated/generated text to speech
    const voiceId = "cuab90umcstNgL8U7orz";  // Replace with actual voice ID
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=1`;  // Added latency optimization
    const headers = {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg'
    };
    const body = JSON.stringify({
        text: translatedText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
            stability: 0.7,
            similarity_boost: 0.9,
            use_speaker_boost: true  // Enable speaker boost
        }
    });
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (response.ok) {
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audioOutput = document.getElementById('audioOutput');
            audioOutput.src = audioUrl;

            // Attempt to play the audio
            const playPromise = audioOutput.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Audio played successfully
                }).catch(error => {
                    // Autoplay was prevented
                    console.log('Autoplay prevented:', error);
                    alert('Audio is ready. Please tap to play.');
                });
            }

            progressBarInner.style.width = '100%';
        } else {
            alert('Failed to fetch data from ElevenLabs');
        }
    } catch (error) {
        console.error('Error fetching data from ElevenLabs:', error);
        alert('An error occurred while fetching data');
    } finally {
        // Hide progress bar after a delay to show completion
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressBarInner.style.width = '0%';
        }, 500);
    }
}
