// --- Symbol Search and Timeframe Selector UI/Logic ---

// Advanced Symbol Search Widget for trading charts
// A standalone search widget that can be launched from anywhere in the app
class SymbolSearchWidget {
    constructor(options = {}) {
        this.container = null;
        this.isVisible = false;
        this.currentResults = [];
        this.selectedCategory = 'All';
        this.searchCallback = options.onSelect || null;
        this.apiEndpoint = options.apiEndpoint || '/api/symbols';
    }
    
    init() {
        if (!this.container) {
            this.create();
            this.addStyles();
            this.addEventListeners();
        }
        return this;
    }
    
    create() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'symbol-search-widget';
        this.container.innerHTML = `
            <div class="search-header">
                <h3>Symbol Search</h3>
                <div class="search-header-actions">
                    <button class="close-btn">×</button>
                </div>
            </div>
            <div class="search-input-container">
                <input type="text" id="search-input" placeholder="Search symbols..." autocomplete="off" />
                <button class="search-clear-btn" title="Clear">×</button>
            </div>
            <div class="search-categories">
                <button class="category-btn active" data-category="All">All</button>
                <button class="category-btn" data-category="Stock">Stock</button>
                <button class="category-btn" data-category="F&O">F&O</button>
                <button class="category-btn" data-category="Exp-Date">Exp-Date</button>
                <button class="category-btn" data-category="Watchlist">Watchlist</button>
            </div>
            <div class="search-results-header">
                <span style="width:160px;">SYMBOL</span>
                <span>DESCRIPTION</span>
                <span id="exchange-header" style="width:80px; text-align:right;">EXCH/EXP</span>
            </div>
            <div class="search-results" id="search-results"></div>
            <div class="search-footer">
                <span id="search-footer-text">Simply start typing ...</span>
                <button class="sync-btn" title="Refresh Symbol Database">
                    <svg class="sync-icon" width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                        <path d="M13.6565 2.34315C12.1822 0.868845 10.1822 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C11.3522 16 14.2157 13.9073 15.3762 11H13.1901C12.1736 12.8272 10.2161 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C9.5945 2 11.0492 2.62546 12.1213 3.69761L9 7H16V0L13.6565 2.34315Z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(this.container);
        return this;
    }
    
    addStyles() {
        if (document.getElementById('search-widget-styles')) return this;
        
        const style = document.createElement('style');
        style.id = 'search-widget-styles';
        style.textContent = `
            #symbol-search-widget {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 600px;
                height: 500px;
                background: var(--bg-element, #2A2E39);
                border: 1px solid var(--border-color, #363C4E);
                border-radius: 6px;
                color: var(--text-primary, #D1D4DC);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 10000;
                display: none;
                flex-direction: column;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
            }
            
            .search-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color, #363C4E);
            }
            
            .search-header h3 {
                margin: 0;
                color: var(--text-primary, #D1D4DC);
                font-size: 16px;
                font-weight: 500;
            }
            
            .search-header-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            /* Make refresh and close buttons visually consistent (scoped to widget) */
            #symbol-search-widget .sync-btn,
            #symbol-search-widget .close-btn {
                background: transparent;
                border: none;
                color: var(--text-secondary, #787B86);
                cursor: pointer;
                width: 24px;
                height: 24px;
                padding: 0;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
            }
            #symbol-search-widget .sync-btn svg { width: 10px; height: 10px; pointer-events: none; }
            #symbol-search-widget .sync-btn:hover,
            #symbol-search-widget .close-btn:hover {
                background: rgba(255, 255, 255, 0.06);
                color: var(--text-primary, #D1D4DC);
            }
            #symbol-search-widget .sync-btn:active,
            #symbol-search-widget .close-btn:active {
                background: rgba(255, 255, 255, 0.1);
                transform: scale(0.96);
            }
            
            /* Only rotate the icon, not the button background */
            #symbol-search-widget .sync-btn.syncing svg {
                animation: rotate 1s linear infinite;
                transform-origin: 50% 50%;
                will-change: transform;
            }
            
            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* Keep close icon small to match sync icon */
            #symbol-search-widget .close-btn {
                font-size: 14px;
                line-height: 1;
            }
            
            .back-btn {
                background: none;
                border: 1px solid var(--border-color, #363C4E);
                color: var(--text-secondary, #787B86);
                font-size: 12px;
                cursor: pointer;
                padding: 6px 12px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                margin-right: 10px;
            }
            
            .back-btn:hover {
                color: var(--text-primary, #D1D4DC);
                border-color: var(--accent-blue, #2962FF);
                background: rgba(41, 98, 255, 0.1);
            }
            
            .search-input-container {
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color, #363C4E);
                width: 100%;
                box-sizing: border-box;
                position: relative;
            }
            
            #search-input {
                width: 100%;
                box-sizing: border-box;
                background: var(--bg-secondary, #1E222D);
                border: 1px solid var(--border-color, #363C4E);
                color: var(--text-primary, #D1D4DC);
                padding: 12px 16px;
                border-radius: 4px;
                font-size: 14px;
                outline: none;
            }
            
            #search-input:focus {
                border-color: var(--accent-blue, #2962FF);
            }

            .search-clear-btn {
                position: absolute;
                right: 28px;
                top: 50%;
                transform: translateY(-50%);
                background: transparent;
                border: none;
                color: var(--text-secondary, #787B86);
                width: 24px;
                height: 24px;
                border-radius: 6px;
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }
            .search-clear-btn.visible { display: flex; }
            .search-clear-btn:hover { background: rgba(255,255,255,0.06); color: var(--text-primary, #D1D4DC); }
            .search-clear-btn:active { background: rgba(255,255,255,0.1); transform: translateY(-50%) scale(0.96); }

            /* (history dropdown removed) */
            
            .search-categories {
                display: flex;
                padding: 0 20px;
                border-bottom: 1px solid var(--border-color, #363C4E);
            }
            
            .category-btn {
                background: none;
                border: none;
                color: var(--text-secondary, #787B86);
                padding: 12px 16px;
                cursor: pointer;
                font-size: 14px;
                border-bottom: 2px solid transparent;
            }
            
            .category-btn.active {
                color: var(--text-primary, #D1D4DC);
                border-bottom-color: var(--accent-blue, #2962FF);
            }
            
            .category-btn:hover {
                color: var(--text-primary, #D1D4DC);
            }
            
            .search-results-header {
                display: flex;
                padding: 12px 20px;
                background: var(--bg-secondary, #1E222D);
                color: var(--text-secondary, #787B86);
                font-size: 12px;
                font-weight: 500;
                text-transform: uppercase;
                width: 100%;
                box-sizing: border-box;
            }
            
            .search-results-header span:first-child {
                width: 160px;
                flex-shrink: 0;
                padding-right: 10px;
            }
            
            .search-results-header span:nth-child(2) {
                flex: 1;
                text-align: center;
                min-width: 100px;
                padding: 0 10px;
            }
            
            .search-results-header span:last-child {
                width: 80px;
                text-align: right;
                flex-shrink: 0;
            }
            
            .search-results {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }
            
            .search-result-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 20px;
                cursor: pointer;
                border-bottom: 1px solid var(--border-color, #363C4E);
                width: 100%;
                box-sizing: border-box;
                gap: 5px;
            }
            
            .search-result-item:hover {
                background: var(--bg-hover, #363C4E);
            }
            
            .result-symbol {
                width: 160px;
                color: var(--accent-blue, #2962FF);
                font-weight: 600;
                flex-shrink: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding-right: 10px;
                box-sizing: border-box;
            }
            
            .result-description {
                flex: 1;
                min-width: 100px;
                color: var(--text-primary, #D1D4DC);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                text-align: left;
                padding: 0 10px;
                box-sizing: border-box;
            }
            
            .result-exchange {
                color: var(--text-secondary, #787B86);
                font-size: 12px;
                width: 80px;
                text-align: right;
                flex-shrink: 0;
                box-sizing: border-box;
            }

            .star-btn {
                background: none;
                border: none;
                color: var(--text-secondary, #787B86);
                cursor: pointer;
                padding: 0 6px 0 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }
            .star-btn.active {
                color: #f7c948;
            }
            
            .search-footer {
                position: relative;
                padding: 12px 20px;
                color: var(--text-secondary, #787B86);
                font-size: 12px;
                text-align: center;
                border-top: 1px solid var(--border-color, #363C4E);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .search-footer .sync-btn {
                position: absolute;
                right: 20px;
                /* reuse same small button sizing */
                width: 24px;
                height: 24px;
            }
        `;
        document.head.appendChild(style);
        return this;
    }
    
    addEventListeners() {
        // Close button
        const closeBtn = this.container.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Sync button (now in footer)
        const syncBtn = this.container.querySelector('.sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.refreshSymbolDatabase());
        }
        
        // Search input
    const searchInput = this.container.querySelector('#search-input');
    const clearBtn = this.container.querySelector('.search-clear-btn');
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value;
            // toggle clear
            clearBtn.classList.toggle('visible', !!q);
            this.performSearch(q);
        });
        // Add to history on Enter
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
        // no-op history removed
            }
        });
        // Show history on focus
        searchInput.addEventListener('focus', () => {
            clearBtn.classList.toggle('visible', !!searchInput.value);
        });
        // Hide on blur (allow click in dropdown)
        searchInput.addEventListener('blur', () => {
        // no-op: history removed
        });
        // Clear button
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            this.hideHistorySuggestions();
            if (this.selectedCategory === 'Exp-Date') {
                this.performSearch(''); // show expiry list
            } else if (this.selectedCategory === 'Watchlist') {
                this.loadWatchlist('');
            } else {
                this.setResults([]);
            }
            searchInput.focus();
        });
        
        // Category buttons
        const categoryBtns = this.container.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active category
                categoryBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedCategory = e.target.dataset.category;
                
                // Update header text based on category
                const exchangeHeader = this.container.querySelector('#exchange-header');
                const searchInput = this.container.querySelector('#search-input');
                const footerText = this.container.querySelector('#search-footer-text');
                
                if (this.selectedCategory === 'F&O' || this.selectedCategory === 'Exp-Date') {
                    exchangeHeader.textContent = 'EXPIRY';
                } else if (this.selectedCategory === 'Stock') {
                    exchangeHeader.textContent = 'EXCHANGE';
                } else if (this.selectedCategory === 'Watchlist') {
                    exchangeHeader.textContent = 'EXCH/EXP';
                } else {
                    exchangeHeader.textContent = 'EXCH/EXP';
                }
                
                if (this.selectedCategory === 'Exp-Date') {
                    searchInput.placeholder = 'Search expiry dates or strike prices (e.g., 28500)...';
                    footerText.textContent = 'Search by expiry date or strike price (e.g., 28500, Jul-2025)';
                } else if (this.selectedCategory === 'Watchlist') {
                    searchInput.placeholder = 'Filter your watchlist...';
                    footerText.textContent = 'Click ★ to remove from watchlist';
                } else {
                    searchInput.placeholder = 'Search symbols...';
                    footerText.textContent = 'Simply start typing ...';
                }
                
                // For Exp-Date category, immediately show available expiry dates if search is empty
                if (this.selectedCategory === 'Exp-Date' && (!searchInput.value || searchInput.value.length === 0)) {
                    this.performSearch('');
                } else if (this.selectedCategory === 'Watchlist') {
                    this.loadWatchlist(searchInput.value);
                } else {
                    // Re-filter results or perform new search
                    this.performSearch(searchInput.value);
                }
            });
        });
        
        // Close on escape or go back if in detailed view
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                if (this.previousState) {
                    // If in detailed view, go back instead of closing
                    this.goBack();
                } else {
                    // Otherwise close the widget
                    this.hide();
                }
            }
        });
    // (history outside-click handler removed)
        
        return this;
    }
    
    show() {
        if (!this.container) {
            this.init();
        }
        this.container.style.display = 'flex';
        this.isVisible = true;
        
        // Set correct header text based on current category
        const exchangeHeader = this.container.querySelector('#exchange-header');
        if (this.selectedCategory === 'F&O' || this.selectedCategory === 'Exp-Date') {
            exchangeHeader.textContent = 'EXPIRY';
        } else if (this.selectedCategory === 'Stock') {
            exchangeHeader.textContent = 'EXCHANGE';
        } else if (this.selectedCategory === 'Watchlist') {
            exchangeHeader.textContent = 'EXCH/EXP';
        } else {
            exchangeHeader.textContent = 'EXCH/EXP';
        }
        
        // Focus search input
        setTimeout(() => {
            const searchInput = this.container.querySelector('#search-input');
            searchInput.focus();
            
            // If Exp-Date category is selected and no search query, show available expiry dates
            if (this.selectedCategory === 'Exp-Date' && (!searchInput.value || searchInput.value.length === 0)) {
                this.performSearch('');
            } else if (this.selectedCategory === 'Watchlist') {
                this.loadWatchlist(searchInput.value || '');
            }
            const clearBtn = this.container.querySelector('.search-clear-btn');
            clearBtn.classList.toggle('visible', !!searchInput.value);
        }, 100);
        
        return this;
    }
    
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.isVisible = false;
        return this;
    }
    
    setResults(results) {
        this.currentResults = results;
        this.updateResults();
        return this;
    }

    // (search history removed)
    
    updateResults() {
        const resultsContainer = this.container.querySelector('#search-results');
        resultsContainer.innerHTML = '';
        
        // Filter by category if not "All", unless we're viewing symbols for a specific expiry date
        let filteredResults = this.currentResults;
        
        // Check if we're in the "symbols for expiry" view by looking for back button
        const isExpirySymbolsView = this.container.querySelector('.back-btn') !== null;
        
        // Only apply category filtering if we're not in the specific expiry view or if category is not "All"
        if (!isExpirySymbolsView && this.selectedCategory !== 'All') {
            filteredResults = this.currentResults.filter(result => 
                result.type && result.type === this.selectedCategory
            );
        }
        
        // If no results after filtering
        if (filteredResults.length === 0) {
            resultsContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary, #787B86);">
                    No matching symbols found
                </div>
            `;
            return this;
        }
        
    // Display results
        filteredResults.forEach(result => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            // Enhanced display for expiry date results
            let symbolDisplay = result.symbol;
            let descriptionDisplay = result.description || '';
            let exchangeDisplay = result.exchange || '';
            
            // Special handling for Exp-Date category results
            if (result.type === 'Exp-Date') {
                symbolDisplay = result.expiry_date || result.symbol;
                descriptionDisplay = `Expiry: ${result.expiry_date || result.symbol}`;
                exchangeDisplay = 'NSE';
            } else if (result.expiry_date && result.type === 'F&O') {
                // For F&O symbols, show expiry date in exchange column if available
                exchangeDisplay = result.expiry_date;
                
                // If it has strike price info, emphasize it in the description
                if (result.strike_price) {
                    const parts = (result.description || '').split(' | ');
                    const strikePart = parts.find(p => p.includes('Strike:'));
                    if (strikePart) {
                        descriptionDisplay = `${strikePart} | ${parts.filter(p => !p.includes('Strike:')).join(' | ')}`;
                    }
                }
            }
            
            const isWatchlisted = !!result.watchlisted;
            item.innerHTML = `
                <button class="star-btn ${isWatchlisted ? 'active' : ''}" title="${isWatchlisted ? 'Remove from' : 'Add to'} watchlist">${isWatchlisted ? '★' : '☆'}</button>
                <div class="result-symbol" title="${symbolDisplay}">${symbolDisplay}</div>
                <div class="result-description" title="${descriptionDisplay}">${descriptionDisplay}</div>
                <div class="result-exchange" title="${exchangeDisplay}">${exchangeDisplay}</div>
            `;
            
            // Star toggle click
            const starBtn = item.querySelector('.star-btn');
            starBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const newState = !starBtn.classList.contains('active');
                this.toggleWatchlist({
                    symbol: result.symbol,
                    description: result.description,
                    exchange: result.exchange,
                    type: result.type
                }, newState).then(success => {
                    if (!success) return;
                    starBtn.classList.toggle('active', newState);
                    starBtn.textContent = newState ? '★' : '☆';
                    starBtn.title = newState ? 'Remove from watchlist' : 'Add to watchlist';
                    // If we are in Watchlist category and removed, hide the row
                    if (this.selectedCategory === 'Watchlist' && !newState) {
                        item.remove();
                    }
                });
            });

            // Row click -> select symbol (except Exp-Date header rows)
            item.addEventListener('click', () => {
                if (this.searchCallback) {
                    // For Exp-Date category, if clicked on an expiry date, fetch all symbols for that expiry
                    if (result.type === 'Exp-Date') {
                        // Debug log to console to check values
                        console.log('Fetching symbols for expiry date:', {
                            timestamp: result.expiry_timestamp,
                            formatted: result.expiry_date
                        });
                        
                        // Make sure we have a valid timestamp
                        if (!result.expiry_timestamp) {
                            console.error('Missing expiry timestamp!', result);
                            alert('Error: Missing expiry timestamp for this date');
                            return;
                        }
                        
                        // Use the expiry timestamp to fetch all symbols for this expiry
                        this.fetchSymbolsByExpiry(result.expiry_timestamp, result.expiry_date);
                        return;
                    } else {
                        this.searchCallback(result.symbol);
                        this.hide();
                    }
                } else {
                    this.hide();
                }
            });
            
            resultsContainer.appendChild(item);
        });
        
        return this;
    }
    
    performSearch(query) {
        // Watchlist mode handled separately
        if (this.selectedCategory === 'Watchlist') {
            this.loadWatchlist(query || '');
            return this;
        }
        // For Exp-Date category, allow empty queries to show available expiry dates
        if (this.selectedCategory === 'Exp-Date') {
            if (!query || query.length === 0) {
                // Show available expiry dates
                const url = `${this.apiEndpoint}?category=${encodeURIComponent(this.selectedCategory)}`;
                
                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        const results = data.map(item => {
                            return {
                                symbol: item.symbol || item.symbol_ticker || item,
                                description: item.description || item.name || '',
                                exchange: item.exchange || 'NSE',  
                                type: item.type || 'Exp-Date',
                                expiry_date: item.expiry_date || item.symbol,
                                // Make sure we have the expiry_timestamp
                                expiry_timestamp: item.expiry_timestamp || item.original
                            };
                        });
                        
                        this.setResults(results);
                    })
                    .catch(error => {
                        console.error("Symbol search error:", error);
                        this.setResults([]);
                    });
                return this;
            }
        } else {
            // For other categories, require at least 2 characters
            if (!query || query.length < 2) {
                this.setResults([]);
                return this;
            }
        }
        
        // Include the selected category in the API request
        const url = `${this.apiEndpoint}?q=${encodeURIComponent(query)}&category=${encodeURIComponent(this.selectedCategory)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                // Transform data if needed
                const results = data.map(item => {
                    // Handle different API response formats
                    return {
                        symbol: item.symbol || item.symbol_ticker || item,
                        description: item.description || item.name || '',
                        exchange: item.exchange || 'NSE',  
                        type: item.type || 'Stock',
                        expiry_date: item.expiry_date || ''
                    };
                });
                
                this.setResults(results);
            })
            .catch(error => {
                console.error("Symbol search error:", error);
                this.setResults([]);
            });
            
        return this;
    }

    async loadWatchlist(query = '') {
        try {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            const resp = await fetch(`/api/watchlist?${params.toString()}`);
            const data = await resp.json();
            const results = data.map(item => ({
                symbol: item.symbol,
                description: item.description || '',
                exchange: item.exchange || 'NSE',
                type: 'Watchlist',
                watchlisted: true
            }));
            this.setResults(results);
            const footerText = this.container.querySelector('#search-footer-text');
            footerText.textContent = results.length ? 'Click a symbol to select. Click ★ to remove.' : 'Your watchlist is empty.';
        } catch (e) {
            console.error('Failed to load watchlist', e);
            this.setResults([]);
        }
    }

    async toggleWatchlist(item, add) {
        try {
            if (add) {
                const resp = await fetch('/api/watchlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
                const data = await resp.json();
                return !!data.success;
            } else {
                const resp = await fetch(`/api/watchlist/${encodeURIComponent(item.symbol)}`, { method: 'DELETE' });
                const data = await resp.json();
                return !!data.success;
            }
        } catch (e) {
            console.error('Watchlist toggle failed', e);
            return false;
        }
    }
    
    fetchSymbolsByExpiry(expiryTimestamp, expiryDateFormatted) {
        // Store the current state for back navigation
        this.previousState = {
            category: this.selectedCategory,
            results: this.currentResults,
            searchValue: this.container.querySelector('#search-input').value
        };
        
    // Clear the search input and show the clear button for quick reset
    const searchInput = this.container.querySelector('#search-input');
    searchInput.value = '';
    const clearBtn = this.container.querySelector('.search-clear-btn');
    if (clearBtn) clearBtn.classList.add('visible');
        
        // Add a back button to the search header
        this.addBackButton(expiryDateFormatted);
        
        // Update the footer text to indicate loading
        const footerText = this.container.querySelector('#search-footer-text');
        const originalFooterText = footerText.textContent;
        footerText.textContent = 'Loading symbols for expiry date...';
        
        // Fetch symbols for the specific expiry timestamp
        const url = `${this.apiEndpoint}/by-expiry?expiry=${encodeURIComponent(expiryTimestamp)}`;
        console.log('Fetching from URL:', url);
        
        fetch(url)
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Received data:', data.length ? `${data.length} symbols` : data);
                
                if (!data || data.length === 0) {
                    console.warn(`No symbols found for expiry date ${expiryDateFormatted} with timestamp ${expiryTimestamp}`);
                    footerText.textContent = `No symbols found for ${expiryDateFormatted}`;
                    return [];
                }
                
                // Transform data to display format
                const results = data.map(item => {
                    return {
                        symbol: item.symbol || item.symbol_ticker,
                        description: item.description || `${item.underlying_symbol || ''} ${item.option_type || ''} Strike: ${item.strike_price || ''}`.trim(),
                        exchange: item.expiry_date || expiryDateFormatted,
                        // Use the current selected category to ensure results are shown properly
                        type: this.selectedCategory || 'F&O',
                        expiry_date: item.expiry_date || expiryDateFormatted,
                        underlying_symbol: item.underlying_symbol,
                        strike_price: item.strike_price,
                        option_type: item.option_type
                    };
                });
                
                // Update footer to show result count
                footerText.textContent = `Found ${results.length} symbols for ${expiryDateFormatted} - Click any symbol to select`;
                
                this.setResults(results);
            })
            .catch(error => {
                console.error("Error fetching symbols by expiry:", error);
                footerText.textContent = 'Error loading symbols for expiry date';
                this.setResults([]);
            });
    }
    
    addBackButton(expiryDate) {
        // Remove existing back button if any
        const existingBackBtn = this.container.querySelector('.back-btn');
        if (existingBackBtn) {
            existingBackBtn.remove();
        }
        
        // Create back button
        const backBtn = document.createElement('button');
        backBtn.className = 'back-btn';
        backBtn.innerHTML = '← Back to Expiry Dates';
        backBtn.title = 'Go back to expiry date list';
        
        // Add click handler
        backBtn.addEventListener('click', () => {
            this.goBack();
        });
        
        // Insert after the h3 title
        const searchHeader = this.container.querySelector('.search-header');
        const title = searchHeader.querySelector('h3');
        title.textContent = `Symbols for ${expiryDate}`;
        
        // Add back button to header actions (before sync and close buttons)
        const headerActions = searchHeader.querySelector('.search-header-actions');
        headerActions.insertBefore(backBtn, headerActions.firstChild);
        
        // Temporarily set the category to 'All' to show all symbols
        const previousCategory = this.selectedCategory;
        this.previousState.previousCategory = previousCategory;
        
        // Update category buttons to show "All" as selected
        const categoryBtns = this.container.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'All');
        });
        
        // Temporarily change selected category to "All" to ensure all symbols show
        this.selectedCategory = 'All';
    }
    
    goBack() {
        if (!this.previousState) return;
        
        // Remove back button
        const backBtn = this.container.querySelector('.back-btn');
        if (backBtn) {
            backBtn.remove();
        }
        
        // Restore header title
        const title = this.container.querySelector('.search-header h3');
        title.textContent = 'Symbol Search';
        
    // Restore search input and clear button visibility
    const searchInput = this.container.querySelector('#search-input');
    searchInput.value = this.previousState.searchValue;
    const clearBtn = this.container.querySelector('.search-clear-btn');
    if (clearBtn) clearBtn.classList.toggle('visible', !!this.previousState.searchValue);
        
        // Restore category selection
        this.selectedCategory = this.previousState.category;
        const categoryBtns = this.container.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === this.selectedCategory);
        });
        
        // Restore footer text
        const footerText = this.container.querySelector('#search-footer-text');
        if (this.selectedCategory === 'Exp-Date') {
            footerText.textContent = 'Search by expiry date or strike price (e.g., 28500, Jul-2025)';
        } else {
            footerText.textContent = 'Simply start typing ...';
        }
        
        // Restore results
        this.setResults(this.previousState.results);
        
        // Clear previous state
        this.previousState = null;
    }
    
    setSearchCallback(callback) {
        this.searchCallback = callback;
        return this;
    }
    
    refreshSymbolDatabase() {
        // Find the sync button and add the syncing class
        const syncBtn = this.container.querySelector('.sync-btn');
        syncBtn.classList.add('syncing');
        
        // Call the API endpoint to refresh the symbol database
        fetch('/api/symbols/refresh', {
            method: 'POST',
        })
        .then(response => response.json())
        .then(data => {
            // Show a notification toast
            this.showNotification(data.success ? 'Symbol database updated successfully!' : 'Failed to update symbol database');
        })
        .catch(error => {
            console.error('Error refreshing symbol database:', error);
            this.showNotification('Failed to update symbol database');
        })
        .finally(() => {
            // Remove the syncing class after a delay
            setTimeout(() => {
                syncBtn.classList.remove('syncing');
            }, 1000);
        });
    }
    
    showNotification(message, duration = 3000) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('search-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'search-notification';
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--bg-element, #2A2E39);
                color: var(--text-primary, #D1D4DC);
                padding: 12px 20px;
                border-radius: 4px;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = message;
        notification.style.opacity = '1';
        
        // Hide after duration
        setTimeout(() => {
            notification.style.opacity = '0';
        }, duration);
    }
}

// Create a singleton instance
export const symbolSearch = new SymbolSearchWidget();

// Enhance navbar with symbol search and timeframe selector functionality
export function enhanceNavbar({ onSymbolSelect, onTimeframeSelect, timeframes = ['1m','5m','15m',], defaultTimeframe = '5m', target }) {
	const navbar = document.querySelector('nav');
	if (!navbar) return;

	// Initialize the symbol search widget
	symbolSearch.init().setSearchCallback(onSymbolSelect);
	
	// Find existing elements to enhance
	const symbolInfo = document.getElementById('symbol-info');
	const timeframeSelector = document.getElementById('timeframe-selector');
	const currentSymbolEl = document.getElementById('current-symbol');

	// Update symbol text with initial value
	if (currentSymbolEl) {
		currentSymbolEl.textContent = 'Search ....';
	}

	// --- Timeframe Selector ---
	if (timeframeSelector) {
		timeframes.forEach(tf => {
			let btn = document.createElement('button');
			btn.textContent = tf;
			btn.className = 'tf-btn';
			if (tf === defaultTimeframe) btn.classList.add('active');
			btn.onclick = () => {
				document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				if (onTimeframeSelect) onTimeframeSelect(tf);
			};
			timeframeSelector.appendChild(btn);
		});
	}

	// --- Make the symbol info area clickable to open search modal ---
	if (symbolInfo) {
		symbolInfo.addEventListener('click', () => {
			symbolSearch.show();
		});
	}
	
	// --- Symbol select callback ---
	const handleSymbolSelect = (symbol) => {
		if (currentSymbolEl) {
			currentSymbolEl.textContent = symbol;
		}
		if (onSymbolSelect) onSymbolSelect(symbol);
	};
	
		// Set the callback for the symbol search widget
	symbolSearch.setSearchCallback(handleSymbolSelect);
	
    // Add global keyboard shortcut to open search (default: Spacebar)
    document.addEventListener('keydown', (e) => {
        // Only trigger when not typing in an input field and no modifier keys are pressed
        if (
            e.code === 'Space' &&
            !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey &&
            document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'TEXTAREA'
        ) {
            e.preventDefault(); // Prevent scrolling or unwanted space
            symbolSearch.show();
        }
    });
}
