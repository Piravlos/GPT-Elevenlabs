document.addEventListener('DOMContentLoaded', function() {
    checkBothKeys();
});

document.getElementById('apiKeyForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const apiKey = document.getElementById('apiKey').value;
    localStorage.setItem('apiKey', apiKey);
    checkBothKeys();
});

document.getElementById('openAiKeyForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const openAiKey = document.getElementById('openAiKey').value;
    localStorage.setItem('openAiKey', openAiKey);
    checkBothKeys();
});

document.getElementById('changeApiKeysButton').addEventListener('click', function() {
    toggleApiKeysForm(true);
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
    const loadingSpinner = document.getElementById('loadingSpinner');
    const audioOutput = document.getElementById('audioOutput');
    const playButton = document.getElementById('playButton');

    if (!apiKey || !openAiKey) {
        console.error('API keys are missing.');
        return;
    }

    let translatedText = "";

    // Show progress bar and loading spinner
    progressBar.style.display = 'block';
    progressBarInner.style.width = '10%';
    loadingSpinner.style.display = 'block';

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
                    { role: "system", content: "You are a helpful assistant that speaks Greek and provides rather short responses. You provide only the Greek response and only in plaintext (no html or markdown code, only plain text). ONLY PLAIN TEXT AND NOTHING ELSE" },
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
        progressBar.style.display = 'none';
        loadingSpinner.style.display = 'none';
        return;
    }

    // Call ElevenLabs API to convert the translated/generated text to speech
    const voiceId = "cuab90umcstNgL8U7orz";  // Replace with actual voice ID
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3`;  // Added latency optimization
    const headers = {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg'
    };
    const body = JSON.stringify({
        text: translatedText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
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
            audioOutput.src = audioUrl;

            // Wait for the audio to be fully loaded before attempting to play
            audioOutput.onloadedmetadata = () => {
                console.log('Audio metadata loaded');
                // Attempt to play the audio
                const playPromise = audioOutput.play();

                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('Audio played successfully');
                    }).catch(error => {
                        console.log('Autoplay prevented:', error);
                    });
                }
            };

            progressBarInner.style.width = '100%';
        } else {
            console.error('Failed to fetch data from ElevenLabs');
        }
    } catch (error) {
        console.error('Error fetching data from ElevenLabs:', error);
    } finally {
        // Show play button and hide progress bar and loading spinner after a delay to show completion
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressBarInner.style.width = '0%';
            loadingSpinner.style.display = 'none';
            playButton.style.display = 'block'; // Always show play button
        }, 500);
    }
}

// Play button handler
document.getElementById('playButton').addEventListener('click', function() {
    const audioOutput = document.getElementById('audioOutput');
    audioOutput.play().then(() => {
        console.log('Audio played after manual interaction');
    }).catch(error => {
        console.error('Error playing audio:', error);
    });
});
