document.addEventListener('DOMContentLoaded', function() {
    checkBothKeys();
    document.getElementById('playButton').style.display = 'block';  // Always show the play button
    console.log('DOMContentLoaded: Initial setup completed');
});

// Save ElevenLabs API Key
document.getElementById('apiKeyForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const apiKey = document.getElementById('apiKey').value;
    localStorage.setItem('apiKey', apiKey);
    alert('ElevenLabs API Key saved securely!');
    console.log('ElevenLabs API Key saved:', apiKey);
    checkBothKeys();
});

// Save OpenAI API Key
document.getElementById('openAiKeyForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const openAiKey = document.getElementById('openAiKey').value;
    localStorage.setItem('openAiKey', openAiKey);
    alert('OpenAI API Key saved securely!');
    console.log('OpenAI API Key saved:', openAiKey);
    checkBothKeys();
});

// Change API Keys Button
document.getElementById('changeApiKeysButton').addEventListener('click', function() {
    toggleApiKeysForm(true);
    console.log('Change API Keys button clicked');
});

function toggleApiKeysForm(show) {
    const apiKeyForm = document.getElementById('apiKeyForm');
    const openAiKeyForm = document.getElementById('openAiKeyForm');
    const changeApiKeysButton = document.getElementById('changeApiKeysButton');

    if (show) {
        apiKeyForm.style.display = 'block';
        openAiKeyForm.style.display = 'block';
        changeApiKeysButton.style.display = 'none';
        console.log('API Key forms shown');
    } else {
        apiKeyForm.style.display = 'none';
        openAiKeyForm.style.display = 'none';
        changeApiKeysButton.style.display = 'block';
        console.log('API Key forms hidden');
    }
}

function checkBothKeys() {
    const apiKey = localStorage.getItem('apiKey');
    const openAiKey = localStorage.getItem('openAiKey');

    if (apiKey) {
        document.getElementById('apiKey').value = apiKey;
        document.getElementById('apiKey').disabled = true;
        document.querySelector('#apiKeyForm button').innerText = 'API Key Saved';
        document.querySelector('#apiKeyForm button').disabled = true;
        console.log('ElevenLabs API Key found:', apiKey);
    }
    if (openAiKey) {
        document.getElementById('openAiKey').value = openAiKey;
        document.getElementById('openAiKey').disabled = true;
        document.querySelector('#openAiKeyForm button').innerText = 'API Key Saved';
        document.querySelector('#openAiKeyForm button').disabled = true;
        console.log('OpenAI API Key found:', openAiKey);
    }
    if (apiKey && openAiKey) {
        document.getElementById('apiInteraction').style.display = 'block';
        toggleApiKeysForm(false);
        console.log('Both API Keys are set');
    } else {
        toggleApiKeysForm(true);
        console.log('One or both API Keys are missing');
    }
}

document.getElementById('translateButton').addEventListener('click', function() {
    handleAction('translate');
    console.log('Translate button clicked');
});

document.getElementById('generateButton').addEventListener('click', function() {
    handleAction('generate');
    console.log('Generate button clicked');
});

async function handleAction(actionType) {
    const apiKey = localStorage.getItem('apiKey');
    const openAiKey = localStorage.getItem('openAiKey');
    const textToConvert = document.getElementById('textToConvert').value;
    const progressBar = document.getElementById('progressBar');
    const progressBarInner = document.querySelector('.progress-bar-inner');
    const textOutput = document.getElementById('textOutput');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const playButton = document.getElementById('playButton');
    const audioOutput = document.getElementById('audioOutput');

    if (!apiKey || !openAiKey) {
        alert('Please enter both API keys first.');
        console.log('Missing API keys');
        return;
    }

    let translatedText = "";
    console.log('Starting action:', actionType);

    // Show progress bar and loading spinner
    progressBar.style.display = 'block';
    progressBarInner.style.width = '10%';
    loadingSpinner.style.display = 'block';

    // Call OpenAI API to translate or generate response in Greek
    try {
        const prompt = actionType === 'translate' 
            ? `Translate the following text to Greek: ${textToConvert}`
            : `The user is asking a question in any language and you provide the response in Greek: ${textToConvert}`;
        
        console.log('OpenAI API request prompt:', prompt);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a helpful assistant that speaks Greek. You provide only the Greek response and only in PLAINTEXT with no breaks or paragraphs as a single block of text." },
                    { role: "user", content: prompt }
                ],
                stream: true  // Enable streaming
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let responseText = '';

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            responseText += decoder.decode(value, { stream: !done });
            progressBarInner.style.width = '50%';

            // Process each chunk of data
            const lines = responseText.split('\n\n');
            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const jsonStr = line.trim().substring(6);
                    if (jsonStr === '[DONE]') {
                        done = true;
                        break;
                    }
                    try {
                        const json = JSON.parse(jsonStr);
                        if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
                            translatedText += json.choices[0].delta.content;
                            textOutput.innerText = translatedText;
                            console.log('Streaming translated text:', translatedText);
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error with OpenAI API:', error);
        alert('Failed to get a response from OpenAI');
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

    console.log('ElevenLabs API request body:', body);
    
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
            console.log('ElevenLabs API response received, audio URL:', audioUrl);

            // Wait for the audio to be fully loaded before attempting to play
            audioOutput.onloadeddata = () => {
                // Attempt to play the audio
                const playPromise = audioOutput.play();

                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        // Audio played successfully
                        console.log('Audio played successfully');
                    }).catch(error => {
                        // Autoplay was prevented
                        console.log('Autoplay prevented:', error);
                        alert('Audio is ready. Please tap the play button to listen.');
                    });
                }
            };

            progressBarInner.style.width = '100%';
        } else {
            alert('Failed to fetch data from ElevenLabs');
            console.log('Failed to fetch data from ElevenLabs');
        }
    } catch (error) {
        console.error('Error fetching data from ElevenLabs:', error);
        alert('An error occurred while fetching data');
    } finally {
        // Hide progress bar and loading spinner after a delay to show completion
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressBarInner.style.width = '0%';
            loadingSpinner.style.display = 'none';
        }, 500);
    }
}

// Play button handler
document.getElementById('playButton').addEventListener('click', function() {
    const audioOutput = document.getElementById('audioOutput');
    audioOutput.play();
    console.log('Play button clicked, audio playing');
});

// Function to clean the response
function cleanResponse(text) {
    // Remove escape sequences and unwanted special characters (*, etc.)
    return text.replace(/[\*\\]/g, '').replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\r/g, ' ');
}
