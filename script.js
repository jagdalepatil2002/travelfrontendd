document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const locationInput = document.getElementById('location-input');
    const resultsContainer = document.getElementById('results-container');
    const loader = document.getElementById('loader');
    
    const modal = document.getElementById('details-modal');
    const modalBody = document.getElementById('modal-body');
    const modalLoader = document.getElementById('modal-loader');
    const closeButton = document.querySelector('.close-button');
    const listenButton = document.getElementById('listen-button');
    const placeDescription = document.getElementById('place-description');

    const API_BASE_URL = 'http://127.0.0.1:5000';

    let isPlaying = false;
    let currentAudio;

    // --- Event Listeners ---

    searchButton.addEventListener('click', searchForPlaces);
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchForPlaces();
        }
    });

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
        stopAudio();
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            stopAudio();
        }
    });

    listenButton.addEventListener('click', () => {
        if (isPlaying) {
            stopAudio();
        } else {
            const textToSpeak = placeDescription.innerText;
            playAudio(textToSpeak);
        }
    });

    // --- Audio Functions ---

    async function playAudio(text) {
        if (!text) return;

        setListenButtonState('loading');
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/text-to-speech`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch audio.');
            }

            // Check if response is JSON (URL) or binary data
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                // Response contains audio URL
                const data = await response.json();
                
                if (data.audio_url) {
                    console.log('Playing audio from URL:', data.audio_url);
                    stopAudio(); // Stop any previous audio
                    
                    currentAudio = new Audio(data.audio_url);
                    
                    // Set up event listeners before playing
                    currentAudio.onloadstart = () => {
                        console.log('Audio loading started');
                    };
                    
                    currentAudio.oncanplay = () => {
                        console.log('Audio can start playing');
                        setListenButtonState('playing');
                    };
                    
                    currentAudio.onended = () => {
                        console.log('Audio playback ended');
                        if (isPlaying) {
                            stopAudio();
                        }
                    };
                    
                    currentAudio.onerror = (e) => {
                        console.error('Error playing audio from URL:', e);
                        console.error('Audio error details:', currentAudio.error);
                        alert('Failed to play audio. The audio file might be temporarily unavailable.');
                        stopAudio();
                    };
                    
                    currentAudio.onloadeddata = () => {
                        console.log('Audio data loaded successfully');
                    };
                    
                    // Start loading the audio
                    currentAudio.load();
                    isPlaying = true;
                    
                    // Attempt to play
                    try {
                        await currentAudio.play();
                        console.log('Audio playback started successfully');
                    } catch (playError) {
                        console.error('Play promise rejected:', playError);
                        // Some browsers require user interaction before playing
                        if (playError.name === 'NotAllowedError') {
                            alert('Please click the Listen button again to start audio playback.');
                        }
                        stopAudio();
                    }
                } else {
                    throw new Error('No audio URL received from server.');
                }
                
            } else {
                // Response contains raw audio data (fallback for direct bytes)
                console.log('Handling raw audio data');
                const audioData = await response.arrayBuffer();
                
                if (audioContext) {
                    await audioContext.close();
                }
                
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                audioSource = audioContext.createBufferSource();

                const audioBuffer = await audioContext.decodeAudioData(audioData);
                
                audioSource.buffer = audioBuffer;
                audioSource.connect(audioContext.destination);
                audioSource.start(0);
                isPlaying = true;
                setListenButtonState('playing');

                audioSource.onended = () => {
                    if (isPlaying) {
                        stopAudio();
                    }
                };
            }

        } catch (error) {
            console.error('Error playing audio:', error);
            alert(`Sorry, could not play the audio. ${error.message}`);
            stopAudio();
        }
    }

    function stopAudio() {
        // Stop HTML5 Audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio.onended = null;
            currentAudio.onerror = null;
            currentAudio.oncanplay = null;
            currentAudio.onloadstart = null;
            currentAudio.onloadeddata = null;
            currentAudio = null;
            console.log('Audio stopped and cleaned up');
        }
        
        // Stop Web Audio API (fallback)
        if (typeof audioSource !== 'undefined' && audioSource) {
            audioSource.onended = null;
            try {
                audioSource.stop();
            } catch (e) {
                // Audio source might already be stopped
            }
            audioSource = null;
        }
        if (typeof audioContext !== 'undefined' && audioContext) {
            audioContext.close().then(() => audioContext = null);
        }
        
        isPlaying = false;
        setListenButtonState('stopped');
    }

    function setListenButtonState(state) {
        const listenIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-volume-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        const stopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-square"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`;
        
        switch (state) {
            case 'loading':
                listenButton.innerHTML = 'Loading...';
                listenButton.disabled = true;
                break;
            case 'playing':
                listenButton.innerHTML = `${stopIcon} Stop`;
                listenButton.disabled = false;
                break;
            case 'stopped':
            default:
                listenButton.innerHTML = `${listenIcon} Listen`;
                listenButton.disabled = false;
                break;
        }
    }

    // --- Search Functions ---

    async function searchForPlaces() {
        const location = locationInput.value.trim();
        if (!location) {
            alert('Please enter a location.');
            return;
        }

        resultsContainer.innerHTML = '';
        loader.style.display = 'block';

        try {
            const response = await fetch(`${API_BASE_URL}/search-places`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: location })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Search Places call used ${data.token_count} tokens.`);
            displayPlaces(data.places);

        } catch (error) {
            console.error('Error fetching places:', error);
            resultsContainer.innerHTML = '<p class="error-message">Sorry, something went wrong. Please try again.</p>';
        } finally {
            loader.style.display = 'none';
        }
    }

    function displayPlaces(places) {
        if (!places || places.length === 0) {
            resultsContainer.innerHTML = '<p>No famous places found. Try a different search.</p>';
            return;
        }

        resultsContainer.innerHTML = ''; // Clear previous results
        places.forEach(place => {
            const card = document.createElement('div');
            card.className = 'result-card';
            
            // Use a fallback image if image_url is null or undefined
            const imageUrl = place.image_url ? place.image_url : `https://picsum.photos/seed/${encodeURIComponent(place.name)}/400/300`;

            card.innerHTML = `
                <img src="${imageUrl}" alt="Image of ${place.name}">
                <div class="card-content">
                    <h3>${place.name}</h3>
                    <p>${place.description}</p>
                </div>
            `;
            card.addEventListener('click', () => showPlaceDetails(place.name));
            resultsContainer.appendChild(card);
        });
    }

    async function showPlaceDetails(placeName) {
        modal.style.display = 'flex';
        modalBody.innerHTML = '';
        modalLoader.style.display = 'block';

        try {
            const response = await fetch(`${API_BASE_URL}/place-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ place_name: placeName })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.token_count === 0) {
                console.log('Place Details loaded from cache (0 tokens used).');
            } else {
                console.log(`Place Details call used ${data.token_count} tokens.`);
            }

            const formattedDescription = data.description
                .replace(/\*\*(.*?)\*\*/g, '<h2>$1</h2>') // Bold sections as subheadings
                .replace(/\n/g, '<br>'); // Newlines to line breaks

            placeDescription.innerHTML = formattedDescription;
            listenButton.style.display = 'block'; // Show the listen button

        } catch (error) {
            console.error('Error fetching place details:', error);
            placeDescription.innerHTML = '<p class="error-message">Could not load details. Please try again later.</p>';
            listenButton.style.display = 'none'; // Hide on error
        } finally {
            modalLoader.style.display = 'none';
        }
    }
});
