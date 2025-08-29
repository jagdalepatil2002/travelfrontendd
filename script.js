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

    const API_BASE_URL = 'https://backendtravel-pgzt.onrender.com';

    let isPlaying = false;

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

    // --- Audio Functions (UPDATED TO USE WEB SPEECH API) ---

    async function playAudio(text) {
        if (!text) return;

        setListenButtonState('loading');
        
        try {
            // Stop any current speech
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }

            // Create speech synthesis utterance
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure voice settings
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            // Use Molly voice specifically
            const voices = window.speechSynthesis.getVoices();
            
            // Try to find Molly voice first
            const mollyVoice = voices.find(voice => 
                voice.name.toLowerCase().includes('molly')
            );
            
            // Fallback to other female voices if Molly not available
            const femaleVoice = voices.find(voice => 
                voice.lang.startsWith('en') && 
                (voice.name.toLowerCase().includes('susan') ||
                 voice.name.toLowerCase().includes('zira') ||
                 voice.name.toLowerCase().includes('karen') ||
                 voice.name.toLowerCase().includes('samantha') ||
                 voice.name.toLowerCase().includes('fiona') ||
                 voice.name.toLowerCase().includes('female'))
            );
            
            // Final fallback to any good English voice
            const anyGoodVoice = voices.find(voice => 
                voice.lang.startsWith('en') && 
                (voice.name.includes('Google') || voice.name.includes('Microsoft'))
            );
            
            if (mollyVoice) {
                utterance.voice = mollyVoice;
                console.log('Using Molly voice:', mollyVoice.name);
            } else if (femaleVoice) {
                utterance.voice = femaleVoice;
                console.log('Molly not found, using female voice:', femaleVoice.name);
            } else if (anyGoodVoice) {
                utterance.voice = anyGoodVoice;
                console.log('No female voice found, using:', anyGoodVoice.name);
            } else {
                console.log('Using default system voice');
            }

            utterance.onstart = () => {
                console.log('Speech started');
                isPlaying = true;
                setListenButtonState('playing');
            };

            utterance.onend = () => {
                console.log('Speech ended');
                isPlaying = false;
                setListenButtonState('stopped');
            };

            utterance.onerror = (event) => {
                console.error('Speech error:', event.error);
                isPlaying = false;
                setListenButtonState('stopped');
                alert('Speech synthesis failed. Please try again.');
            };

            // Start speaking - NO BACKEND CALL!
            window.speechSynthesis.speak(utterance);

        } catch (error) {
            console.error('Speech error:', error);
            isPlaying = false;
            setListenButtonState('stopped');
            alert('Speech not supported in this browser.');
        }
    }

    function stopAudio() {
        // Stop speech synthesis
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        isPlaying = false;
        setListenButtonState('stopped');
        console.log('Speech stopped');
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

    // Initialize speech synthesis voices
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            console.log('Speech voices loaded:', window.speechSynthesis.getVoices().length);
            // Log all available voices for debugging
            window.speechSynthesis.getVoices().forEach((voice, index) => {
                console.log(`${index}: ${voice.name} (${voice.lang}) - ${voice.gender || 'unknown gender'}`);
            });
        });
    } else {
        // Log voices if already loaded
        window.speechSynthesis.getVoices().forEach((voice, index) => {
            console.log(`${index}: ${voice.name} (${voice.lang}) - ${voice.gender || 'unknown gender'}`);
        });
    }
});
