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

    const API_BASE_URL = 'http://127.0.0.1:5000';

    // --- Event Listeners ---

    searchButton.addEventListener('click', searchForPlaces);
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchForPlaces();
        }
    });

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    let isSpeaking = false;
    let currentUtterance = null;

    listenButton.addEventListener('click', () => {
        if (isSpeaking) {
            // Stop speech
            window.speechSynthesis.cancel();
            isSpeaking = false;
            listenButton.textContent = 'Listen to Guide';
            return;
        }
        // Extract only the section content (titles and text) from the modal
        let sectionsText = '';
        const sectionBlocks = document.querySelectorAll('.section-block');
        
        if (sectionBlocks.length === 0) {
            alert('No guide text to read.');
            return;
        }
        
        sectionBlocks.forEach(block => {
            const title = block.querySelector('.section-title').textContent;
            const content = block.querySelector('.section-content').value;
            sectionsText += title + ". " + content + ". ";
        });
        
        // Cancel any ongoing speech just in case
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        // Create and speak the utterance with only the section content
        currentUtterance = new window.SpeechSynthesisUtterance(sectionsText);
        currentUtterance.rate = 1;
        currentUtterance.pitch = 1;
        currentUtterance.lang = 'en-US';
        isSpeaking = true;
        listenButton.textContent = 'Stop Listening';
        currentUtterance.onend = () => {
            isSpeaking = false;
            listenButton.textContent = 'Listen to Guide';
        };
        currentUtterance.onerror = () => {
            isSpeaking = false;
            listenButton.textContent = 'Listen to Guide';
        };
        window.speechSynthesis.speak(currentUtterance);
    });

    // Also reset button if modal is closed
    function resetListenButton() {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
        }
        listenButton.textContent = 'Listen to Guide';
    }

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
        resetListenButton();
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            resetListenButton();
        }
    });

    // --- Functions ---

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

    // --- Paginated Section Logic ---
    let paginatedSections = [];
    let currentPage = 0;
    let currentPlaceName = '';
    let allSections = [];

    async function showPlaceDetails(placeName) {
        modal.style.display = 'flex';
        modalBody.innerHTML = '';
        modalLoader.style.display = 'block';
        currentPlaceName = placeName;
        currentPage = 0;
        paginatedSections = [];
        allSections = [];

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

            // Parse markdown into sections (client-side JS version)
            allSections = splitMarkdownSections(data.description);
            paginatedSections = paginateSections(allSections, 3, 6000);
            renderCurrentPage();
        } catch (error) {
            console.error('Error fetching place details:', error);
            modalBody.innerHTML = '<p class="error-message">Could not load details. Please try again later.</p>';
        } finally {
            modalLoader.style.display = 'none';
        }
    }

    function splitMarkdownSections(markdown) {
        // Split by headings (## ...)
        const regex = /^##\s+(.+)$/gm;
        let match, lastIndex = 0, sections = [];
        let matches = [];
        while ((match = regex.exec(markdown)) !== null) {
            matches.push({index: match.index, title: match[0]});
        }
        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].index;
            const end = (i + 1 < matches.length) ? matches[i+1].index : markdown.length;
            const title = matches[i].title;
            const content = markdown.substring(start + title.length, end).trim();
            sections.push({title: title, content: content});
        }
        return sections;
    }

    function paginateSections(sections, maxSectionsPerPage = 3, maxCharsPerPage = 6000) {
        let pages = [];
        let i = 0;
        while (i < sections.length) {
            let page = [];
            let chars = 0;
            for (let j = 0; j < maxSectionsPerPage; j++) {
                if (i + j >= sections.length) break;
                let section = sections[i + j];
                let sectionLen = (section.title.length + section.content.length);
                if (chars + sectionLen > maxCharsPerPage && j > 0) break;
                page.push({...section});
                chars += sectionLen;
            }
            pages.push(page);
            i += page.length;
        }
        return pages;
    }

    function renderCurrentPage() {
        if (!paginatedSections.length) return;
        const pageSections = paginatedSections[currentPage];
        modalBody.innerHTML = '';
        pageSections.forEach((section, idx) => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section-block';
            sectionDiv.innerHTML = `
                <div class="section-header">
                    <h2 contenteditable="true" class="section-title">${section.title.replace(/^##\s*/, '')}</h2>
                    <button class="edit-section" title="Edit section"><span>✏️</span></button>
                    <button class="delete-section" title="Delete section"><span>🗑️</span></button>
                </div>
                <textarea class="section-content">${section.content}</textarea>
                <div class="section-controls">
                    <input class="user-instruction" type="text" placeholder="How do you want to change this section? (optional)" style="flex:1; margin-right:0.5rem;">
                    <button class="regen-section" title="Regenerate this section"><span>🔄</span> Regenerate</button>
                    <button class="copy-section" title="Copy to clipboard"><span>📋</span> Copy</button>
                </div>
            `;
            modalBody.appendChild(sectionDiv);
        });
        // Update pagination controls
        document.getElementById('prev-page').style.display = (currentPage > 0) ? '' : 'none';
        document.getElementById('next-page').style.display = (currentPage < paginatedSections.length - 1) ? '' : 'none';
        document.getElementById('page-indicator').textContent = `Page ${currentPage + 1} of ${paginatedSections.length}`;
        // Add listeners for copy and regen
        Array.from(document.getElementsByClassName('copy-section')).forEach((btn, idx) => {
            btn.onclick = () => {
                const textarea = btn.parentElement.parentElement.querySelector('.section-content');
                navigator.clipboard.writeText(textarea.value);
            };
        });
        Array.from(document.getElementsByClassName('regen-section')).forEach((btn, idx) => {
            btn.onclick = async () => {
                const userInstruction = btn.parentElement.querySelector('.user-instruction').value;
                await regenerateSection(idx, userInstruction);
            };
        });
        Array.from(document.getElementsByClassName('edit-section')).forEach((btn, idx) => {
            btn.onclick = () => {
                const textarea = btn.parentElement.parentElement.querySelector('.section-content');
                textarea.focus();
            };
        });
        Array.from(document.getElementsByClassName('delete-section')).forEach((btn, idx) => {
            btn.onclick = () => {
                if (confirm('Are you sure you want to delete this section?')) {
                    paginatedSections[currentPage].splice(idx, 1);
                    renderCurrentPage();
                }
            };
        });
        // Scroll modal to top on page change
        modalBody.parentElement.scrollTop = 0;
    }

    document.getElementById('prev-page').onclick = () => {
        if (currentPage > 0) {
            saveEditsToPage();
            currentPage--;
            renderCurrentPage();
        }
    };
    document.getElementById('next-page').onclick = () => {
        if (currentPage < paginatedSections.length - 1) {
            saveEditsToPage();
            currentPage++;
            renderCurrentPage();
        }
    };

    function saveEditsToPage() {
        // Save edits from current page to paginatedSections
        const pageSections = paginatedSections[currentPage];
        const sectionDivs = modalBody.querySelectorAll('.section-block');
        sectionDivs.forEach((div, idx) => {
            const title = div.querySelector('.section-title').textContent;
            const content = div.querySelector('.section-content').value;
            pageSections[idx].title = '## ' + title;
            pageSections[idx].content = content;
        });
    }

    async function regenerateSection(idx, userInstruction = '') {
        saveEditsToPage();
        const section = paginatedSections[currentPage][idx];
        // Call backend to regenerate this section
        modalLoader.style.display = 'block';
        try {
            const requestData = {
                place_name: currentPlaceName,
                section_title: section.title,
                current_text: section.content,
                user_instruction: userInstruction
            };
            const response = await fetch(`${API_BASE_URL}/regenerate-section`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to regenerate section: ${response.status} ${errorText}`);
            }
            const data = await response.json();
            section.content = data.regenerated_content;
            renderCurrentPage();
        } catch (e) {
            alert('Could not regenerate section: ' + e.message);
        } finally {
            modalLoader.style.display = 'none';
        }
    }

    document.getElementById('download-all').onclick = () => {
        saveEditsToPage();
        // Combine all sections into one text
        let allText = '';
        paginatedSections.flat().forEach(section => {
            allText += section.title + '\n' + section.content + '\n\n';
        });
        const blob = new Blob([allText], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentPlaceName}_guide.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    document.getElementById('save-all').onclick = async () => {
        saveEditsToPage();
        // Combine all sections into one markdown
        let allMarkdown = '';
        paginatedSections.flat().forEach(section => {
            allMarkdown += section.title + '\n' + section.content + '\n\n';
        });
        
        console.log("Saving all content...");
        console.log("Place name:", currentPlaceName);
        console.log("Content length:", allMarkdown.length);
        console.log("First 100 chars:", allMarkdown.substring(0, 100));
        
        modalLoader.style.display = 'block';
        try {
            const requestData = {
                place_name: currentPlaceName,
                description: allMarkdown
            };
            
            console.log("Sending request to /save-detailed-description:", requestData.place_name);
            
            const response = await fetch(`${API_BASE_URL}/save-detailed-description`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            console.log("Save response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to save: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            console.log("Save response:", data);
            
            alert('Guide saved successfully!');
        } catch (e) {
            console.error("Save error:", e);
            alert('Could not save: ' + e.message);
        } finally {
            modalLoader.style.display = 'none';
        }
    };
});
