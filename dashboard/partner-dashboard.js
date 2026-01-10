// ===============================
// CONFIGURATION
// ===============================
const CONFIG = {
    CLIENT_ID: '440103208396-uou0t99knmu2a7dd4ieadvmtlcu47k3g.apps.googleusercontent.com',
    API_KEY: 'AIzaSyA2rnwUC3x2OZzwqULdgvkkcyEK1uKqI34',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar.readonly',
    AUTO_SYNC_INTERVAL: 30 * 60 * 1000 // 30 minutes
};

// ===============================
// STATE MANAGEMENT
// ===============================
class DashboardState {
    constructor() {
        this.bookings = [];
        this.filteredBookings = [];
        this.currentCalendarId = 'primary';
        this.isAuthenticated = false;
        this.isLoading = false;
        this.autoSyncInterval = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.tokenClient = null;
    }

    setBookings(bookings) {
        this.bookings = bookings;
        this.filteredBookings = bookings;
        this.saveToLocalStorage();
    }

    setAuthenticated(value) {
        this.isAuthenticated = value;
    }

    setLoading(value) {
        this.isLoading = value;
        toggleLoadingOverlay(value);
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('btp_bookings', JSON.stringify(this.bookings));
            localStorage.setItem('btp_last_sync', new Date().toISOString());
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('btp_bookings');
            if (saved) {
                this.bookings = JSON.parse(saved);
                this.filteredBookings = this.bookings;
                return true;
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
        }
        return false;
    }
}

const state = new DashboardState();

// ===============================
// UTILITY FUNCTIONS
// ===============================
const Toast = {
    show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <span style="font-size: 1.5rem;">${icons[type]}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

function toggleLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('nl-NL', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===============================
// VALIDATION & PARSING
// ===============================
function validateBookingData(booking) {
    const required = ['id', 'experienceName', 'customer', 'date'];
    const missing = required.filter(field => !booking[field]);
    
    if (missing.length > 0) {
        console.warn(`Missing required fields: ${missing.join(', ')}`, booking);
        return false;
    }
    
    return true;
}

function parseBookingEvent(event) {
    try {
        const description = event.description || '';
        
        const getField = (key) => {
            const regex = new RegExp(`${key}:\\s*(.+)`, 'i');
            const match = description.match(regex);
            return match ? match[1].trim() : '';
        };

        const idMatch = event.summary?.match(/BTP-\d+/);
        
        const booking = {
            id: idMatch ? idMatch[0] : `BTP-${Date.now()}`,
            experienceName: event.summary?.replace(/BTP-\d+\s*-?\s*/, '').trim() || 'Unknown Experience',
            customer: getField('Customer') || getField('Name') || 'Unknown',
            email: getField('Email') || '',
            phone: getField('Phone') || '',
            date: event.start?.dateTime || event.start?.date || new Date().toISOString(),
            guests: parseInt(getField('Guests')) || 1,
            status: (getField('Status') || 'confirmed').toLowerCase(),
            amount: parseFloat((getField('Amount') || '0').replace(/[^\d.]/g, '')) || 0,
            description: description,
            location: event.location || '',
            calendarLink: event.htmlLink || '',
            rawEvent: event
        };

        if (!validateBookingData(booking)) {
            console.error('Invalid booking data:', booking);
            return null;
        }

        return booking;
    } catch (error) {
        console.error('Error parsing booking event:', error, event);
        return null;
    }
}

// ===============================
// GOOGLE API INITIALIZATION
// ===============================
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: CONFIG.API_KEY,
            discoveryDocs: [CONFIG.DISCOVERY_DOC],
        });
        state.gapiInited = true;
        maybeEnableButtons();
    } catch (error) {
        console.error('Error initializing GAPI:', error);
        Toast.show('Failed to initialize Google API', 'error');
    }
}

function gisLoaded() {
    try {
        state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.CLIENT_ID,
            scope: CONFIG.SCOPES,
            callback: '', // Will be set in handleAuthClick
        });
        state.gisInited = true;
        maybeEnableButtons();
    } catch (error) {
        console.error('Error initializing GIS:', error);
        Toast.show('Failed to initialize Google Sign-In', 'error');
    }
}

function maybeEnableButtons() {
    if (state.gapiInited && state.gisInited) {
        const btn = document.getElementById('connectGoogleBtn');
        btn.disabled = false;
        document.getElementById('connectBtnText').textContent = 'Connect Google Calendar';
        
        // Check if already signed in
        if (gapi.client.getToken()) {
            updateUIForSignedIn();
            loadCalendarList();
            
            // Load from cache first for better UX
            if (state.loadFromLocalStorage()) {
                renderBookingsTable();
                updateStats();
            }
            
            syncCalendar();
        }
    }
}

// ===============================
// AUTHENTICATION
// ===============================
async function handleAuthClick() {
    state.tokenClient.callback = async (response) => {
        if (response.error !== undefined) {
            Toast.show('Authentication failed: ' + response.error, 'error');
            throw response;
        }
        
        Toast.show('Successfully connected to Google Calendar!', 'success');
        updateUIForSignedIn();
        await loadCalendarList();
        await syncCalendar();
        startAutoSync();
    };

    try {
        if (gapi.client.getToken() === null) {
            state.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            state.tokenClient.requestAccessToken({ prompt: '' });
        }
    } catch (error) {
        console.error('Auth error:', error);
        Toast.show('Failed to connect to Google', 'error');
    }
}

function handleSignoutClick() {
    const confirmed = confirm('Are you sure you want to disconnect your Google Calendar?');
    if (!confirmed) return;

    try {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
        
        stopAutoSync();
        updateUIForSignedOut();
        Toast.show('Disconnected from Google Calendar', 'info');
    } catch (error) {
        console.error('Signout error:', error);
        Toast.show('Error disconnecting', 'error');
    }
}

function updateUIForSignedIn() {
    state.setAuthenticated(true);
    document.getElementById('connectGoogleSection').classList.add('hidden');
    document.getElementById('connectedGoogleSection').classList.remove('hidden');
}

function updateUIForSignedOut() {
    state.setAuthenticated(false);
    document.getElementById('connectGoogleSection').classList.remove('hidden');
    document.getElementById('connectedGoogleSection').classList.add('hidden');
    state.setBookings([]);
    renderBookingsTable();
    updateStats();
}

// ===============================
// AUTO-SYNC FUNCTIONALITY
// ===============================
function startAutoSync() {
    const autoSyncEnabled = document.getElementById('autoSync')?.checked;
    if (!autoSyncEnabled) return;

    stopAutoSync(); // Clear any existing interval
    
    state.autoSyncInterval = setInterval(() => {
        console.log('Auto-syncing calendar...');
        syncCalendar(true); // true = silent mode
    }, CONFIG.AUTO_SYNC_INTERVAL);
    
    console.log('Auto-sync started (every 30 minutes)');
}

function stopAutoSync() {
    if (state.autoSyncInterval) {
        clearInterval(state.autoSyncInterval);
        state.autoSyncInterval = null;
        console.log('Auto-sync stopped');
    }
}

// ===============================
// CALENDAR OPERATIONS
// ===============================
async function loadCalendarList() {
    try {
        const response = await gapi.client.calendar.calendarList.list();
        const calendars = response.result.items || [];
        
        const select = document.getElementById('calendarSelect');
        if (select) {
            select.innerHTML = calendars.map(cal => 
                `<option value="${cal.id}" ${cal.id === state.currentCalendarId ? 'selected' : ''}>
                    ${cal.summary}
                </option>`
            ).join('');
        }

        // Update connected calendar name
        const currentCal = calendars.find(c => c.id === state.currentCalendarId);
        if (currentCal) {
            document.getElementById('connectedCalendarName').textContent = currentCal.summary;
        }
    } catch (error) {
        console.error('Error loading calendar list:', error);
        Toast.show('Failed to load calendars', 'error');
    }
}

async function syncCalendar(silent = false) {
    if (!silent) {
        state.setLoading(true);
        Toast.show('Syncing bookings...', 'info', 2000);
    }

    try {
        const now = new Date();
        const twoMonthsAgo = new Date(now);
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        const response = await gapi.client.calendar.events.list({
            calendarId: state.currentCalendarId,
            timeMin: twoMonthsAgo.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 250
        });

        const events = response.result.items || [];
        
        // Filter and parse events with BTP- prefix
        const parsedBookings = events
            .filter(event => event.summary && event.summary.includes('BTP-'))
            .map(event => parseBookingEvent(event))
            .filter(booking => booking !== null);

        state.setBookings(parsedBookings);
        updateStats();
        renderBookingsTable();
        updateLastSyncTime();

        if (!silent) {
            Toast.show(`Successfully synced ${parsedBookings.length} bookings`, 'success');
        }
    } catch (error) {
        console.error('Sync error:', error);
        
        if (!silent) {
            let errorMessage = 'Failed to sync calendar';
            
            if (error.status === 401) {
                errorMessage = 'Session expired. Please reconnect.';
                handleSignoutClick();
            } else if (error.status === 403) {
                errorMessage = 'Permission denied. Please check calendar access.';
            }
            
            Toast.show(errorMessage, 'error');
        }
    } finally {
        if (!silent) {
            state.setLoading(false);
        }
    }
}

function updateLastSyncTime() {
    const syncEl = document.getElementById('lastSyncTime');
    if (syncEl) {
        const now = new Date();
        syncEl.textContent = now.toLocaleTimeString('nl-NL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// ===============================
// STATS & ANALYTICS
// ===============================
function updateStats() {
    const total = state.bookings.length;
    const totalGuests = state.bookings.reduce((sum, b) => sum + b.guests, 0);
    const totalRevenue = state.bookings.reduce((sum, b) => sum + b.amount, 0);
    
    // Calculate upcoming bookings (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcoming = state.bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= now && bookingDate <= thirtyDaysFromNow;
    }).length;

    // Update DOM
    document.getElementById('totalBookings').textContent = total;
    document.getElementById('upcomingBookings').textContent = upcoming;
    document.getElementById('totalGuests').textContent = totalGuests;
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
}

// ===============================
// FILTERING & SEARCH
// ===============================
function applyFilters() {
    const searchTerm = document.getElementById('searchBox')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const dateFilter = document.getElementById('dateFilter')?.value || 'all';

    let filtered = [...state.bookings];

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(booking => 
            booking.customer.toLowerCase().includes(searchTerm) ||
            booking.id.toLowerCase().includes(searchTerm) ||
            booking.experienceName.toLowerCase().includes(searchTerm) ||
            booking.email.toLowerCase().includes(searchTerm)
        );
    }

    // Status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Date filter
    const now = new Date();
    if (dateFilter !== 'all') {
        filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.date);
            
            switch(dateFilter) {
                case 'upcoming':
                    return bookingDate >= now;
                case 'past':
                    return bookingDate < now;
                case 'today':
                    return bookingDate.toDateString() === now.toDateString();
                case 'week':
                    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return bookingDate >= now && bookingDate <= weekFromNow;
                case 'month':
                    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    return bookingDate >= now && bookingDate <= monthFromNow;
                default:
                    return true;
            }
        });
    }

    state.filteredBookings = filtered;
    renderBookingsTable();
}

// Debounced search
const debouncedSearch = debounce(applyFilters, 300);

// ===============================
// UI RENDERING
// ===============================
function renderBookingsTable() {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;
    
    if (state.filteredBookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <h3>No Bookings Found</h3>
                <p>${state.bookings.length === 0 
                    ? 'Connect your Google Calendar and sync to see bookings.' 
                    : 'Try adjusting your filters or search term.'
                }</p>
            </div>
        `;
        return;
    }

    // Sort by date (most recent first)
    const sorted = [...state.filteredBookings].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Experience</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Guests</th>
                    <th>Status</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(booking => `
                    <tr onclick="showBookingDetail('${booking.id}')">
                        <td><strong>${booking.id}</strong></td>
                        <td>${booking.experienceName}</td>
                        <td>${booking.customer}</td>
                        <td>${formatDate(booking.date)}</td>
                        <td>${booking.guests}</td>
                        <td><span class="badge badge-${booking.status}">${booking.status}</span></td>
                        <td><strong>${formatCurrency(booking.amount)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showBookingDetail(bookingId) {
    const booking = state.bookings.find(b => b.id === bookingId);
    if (!booking) {
        Toast.show('Booking not found', 'error');
        return;
    }

    const modal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="color: #667eea; font-size: 1.3rem; margin-bottom: 10px;">
                ${booking.experienceName}
            </h3>
            <span class="badge badge-${booking.status}">${booking.status}</span>
        </div>

        <div class="info-grid">
            <div class="info-section">
                <h4>👤 Customer Information</h4>
                <div class="info-item">
                    <span class="info-item-icon">👤</span>
                    <span>${booking.customer}</span>
                </div>
                ${booking.email ? `
                    <div class="info-item">
                        <span class="info-item-icon">✉️</span>
                        <a href="mailto:${booking.email}" style="color: #667eea;">${booking.email}</a>
                    </div>
                ` : ''}
                ${booking.phone ? `
                    <div class="info-item">
                        <span class="info-item-icon">📞</span>
                        <a href="tel:${booking.phone}" style="color: #667eea;">${booking.phone}</a>
                    </div>
                ` : ''}
            </div>

            <div class="info-section">
                <h4>📅 Booking Information</h4>
                <div class="info-item">
                    <span class="info-item-icon">🆔</span>
                    <span><strong>${booking.id}</strong></span>
                </div>
                <div class="info-item">
                    <span class="info-item-icon">📅</span>
                    <span>${formatDate(booking.date)}</span>
                </div>
                <div class="info-item">
                    <span class="info-item-icon">👥</span>
                    <span>${booking.guests} guest${booking.guests > 1 ? 's' : ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-item-icon">💰</span>
                    <span><strong>${formatCurrency(booking.amount)}</strong></span>
                </div>
                ${booking.location ? `
                    <div class="info-item">
                        <span class="info-item-icon">📍</span>
                        <span>${booking.location}</span>
                    </div>
                ` : ''}
            </div>
        </div>

        ${booking.description ? `
            <div class="description-box">
                <strong style="display: block; margin-bottom: 8px;">📝 Notes:</strong>
                <div style="white-space: pre-wrap; color: #555;">${booking.description}</div>
            </div>
        ` : ''}

        ${booking.calendarLink ? `
            <div style="margin-top: 20px;">
                <a href="${booking.calendarLink}" target="_blank" class="btn btn-secondary">
                    📅 View in Google Calendar
                </a>
            </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.classList.remove('active');
}

// ===============================
// EXPERIENCES
// ===============================
function renderExperiences() {
    const container = document.getElementById('experienceContainer');
    if (!container) return;

    const experiences = [
        {
            title: "1. Full Day Package – Hidden Spots & Football",
            price: "Half day: €50 | Full day: €120 – €200",
            highlights: [
                "City exploration (Surco – Barranco)",
                "Local and hidden gastronomic gems",
                "Alianza Lima football match experience"
            ],
            includes: "Match tickets, Alianza Lima T-shirt, 2 beers"
        },
        {
            title: "2. Two Days, One Night – Culture & Coastal",
            price: "Day 1: €80 | Day 2: €150 – €200",
            highlights: [
                "Gastronomy tasting & Horse riding",
                "Miraflores coastal exploration",
                "Alianza Lima football match"
            ],
            includes: "All transfers, Horse riding session, Match tickets, T-shirt, 2 beers"
        },
        {
            title: "3. Three Days, Two Nights – Complete Lima",
            price: "Day 1: €100 | Day 2: €80 | Day 3: €100 – €200",
            highlights: [
                "San Bartolo beach adventure",
                "Horse riding & ATV experiences",
                "Full Gastronomy & Football experience"
            ],
            includes: "All transfers, ATVs, Sea equipment, Match tickets, T-shirt, 2 beers"
        }
    ];

    container.innerHTML = experiences.map(exp => `
        <div class="exp-card">
            <div class="exp-banner">${exp.title}</div>
            <div class="exp-body">
                <span class="exp-price">${exp.price}</span>
                <ul class="exp-highlights">
                    ${exp.highlights.map(h => `<li>${h}</li>`).join('')}
                </ul>
                <div class="exp-includes">
                    <strong>Includes:</strong> ${exp.includes}
                </div>
            </div>
        </div>
    `).join('');
}

// ===============================
// NAVIGATION
// ===============================
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Activate nav item
    const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Section-specific logic
    if (sectionId === 'experiences') {
        renderExperiences();
    }

    // Close mobile menu if open
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.remove('mobile-open');
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.toggle('mobile-open');
}

// ===============================
// SETTINGS
// ===============================
function saveCalendarSettings() {
    const newCalendarId = document.getElementById('calendarSelect')?.value;
    
    if (newCalendarId && newCalendarId !== state.currentCalendarId) {
        state.currentCalendarId = newCalendarId;
        Toast.show('Settings saved. Syncing with new calendar...', 'success');
        syncCalendar();
    } else {
        Toast.show('No changes to save', 'info');
    }
}

// ===============================
// PARTNER INFO
// ===============================
function loadPartnerInfo() {
    // In a real application, this would fetch from a backend
    const partnerData = {
        name: 'Beyond the Pitch Lima',
        email: 'experiences@beyondthepitch.com'
    };

    document.getElementById('partnerName').textContent = partnerData.name;
    document.getElementById('partnerEmail').textContent = partnerData.email;
    document.getElementById('welcomeText').textContent = `Welcome back!`;
}

// ===============================
// LOGOUT
// ===============================
function handleLogout() {
    const confirmed = confirm('Are you sure you want to log out?');
    if (confirmed) {
        handleSignoutClick();
        Toast.show('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }
}

// ===============================
// EVENT LISTENERS
// ===============================
function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            showSection(section);
        });
    });

    // Buttons
    document.getElementById('connectGoogleBtn')?.addEventListener('click', handleAuthClick);
    document.getElementById('disconnectBtn')?.addEventListener('click', handleSignoutClick);
    document.getElementById('syncBtn')?.addEventListener('click', () => syncCalendar());
    document.getElementById('refreshBookingsBtn')?.addEventListener('click', () => syncCalendar());
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveCalendarSettings);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Modal
    document.getElementById('closeModal')?.addEventListener('click', closeBookingModal);
    document.getElementById('bookingModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'bookingModal') {
            closeBookingModal();
        }
    });

    // Search & Filters
    document.getElementById('searchBox')?.addEventListener('input', debouncedSearch);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('dateFilter')?.addEventListener('change', applyFilters);

    // Auto-sync toggle
    document.getElementById('autoSync')?.addEventListener('change', (e) => {
        if (e.target.checked && state.isAuthenticated) {
            startAutoSync();
            Toast.show('Auto-sync enabled', 'success');
        } else {
            stopAutoSync();
            Toast.show('Auto-sync disabled', 'info');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC to close modal
        if (e.key === 'Escape') {
            closeBookingModal();
        }
        
        // Ctrl/Cmd + R to refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && state.isAuthenticated) {
            e.preventDefault();
            syncCalendar();
        }
    });
}

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Beyond the Pitch Partner Dashboard...');
    
    // Load partner information
    loadPartnerInfo();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load Google APIs
    gapiLoaded();
    gisLoaded();
    
    // Check for mobile
    if (window.innerWidth <= 768) {
        document.getElementById('mobileMenuBtn')?.classList.remove('hidden');
    }
    
    console.log('✅ Dashboard initialized successfully');
});

// Expose necessary functions to global scope
window.handleAuthClick = handleAuthClick;
window.handleSignoutClick = handleSignoutClick;
window.syncCalendar = syncCalendar;
window.showSection = showSection;
window.showBookingDetail = showBookingDetail;
window.closeBookingModal = closeBookingModal;
window.toggleMobileMenu = toggleMobileMenu;

// ===============================
// BOOKING WIDGET INTEGRATION
// ===============================
function copyBookingUrl() {
    const urlInput = document.getElementById('bookingWidgetUrl');
    urlInput.select();
    document.execCommand('copy');
    Toast.show('Booking URL copied to clipboard!', 'success');
}

function openNewBookingModal() {
    showSection('new-booking');
}

async function createManualBooking() {
    const experience = document.getElementById('newBookingExperience')?.value;
    const name = document.getElementById('newBookingName')?.value.trim();
    const email = document.getElementById('newBookingEmail')?.value.trim();
    const phone = document.getElementById('newBookingPhone')?.value.trim();
    const date = document.getElementById('newBookingDate')?.value;
    const guests = document.getElementById('newBookingGuests')?.value;
    const amount = document.getElementById('newBookingAmount')?.value || '0';
    const notes = document.getElementById('newBookingNotes')?.value.trim();

    // Validation
    if (!name || !date || !guests || !experience) {
        Toast.show('Please fill in all required fields', 'error');
        return;
    }

    state.setLoading(true);

    try {
        // Generate booking ID
        const bookingId = `BTP-${Date.now().toString().slice(-6)}`;
        
        // Create calendar event
        const eventDateTime = new Date(date);
        eventDateTime.setHours(10, 0, 0); // Default to 10:00 AM
        
        const event = {
            summary: `${bookingId} - ${experience}`,
            description: `
Customer: ${name}
Email: ${email || 'Not provided'}
Phone: ${phone || 'Not provided'}
Guests: ${guests}
Amount: €${amount}
Status: confirmed

Notes:
${notes || 'No special requests'}
            `.trim(),
            start: {
                dateTime: eventDateTime.toISOString(),
                timeZone: 'America/Lima'
            },
            end: {
                dateTime: new Date(eventDateTime.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours later
                timeZone: 'America/Lima'
            },
            location: 'Lima, Peru'
        };

        // Insert into Google Calendar
        const response = await gapi.client.calendar.events.insert({
            calendarId: state.currentCalendarId,
            resource: event
        });

        if (response.status === 200) {
            Toast.show('Booking created successfully!', 'success');
            
            // Clear form
            document.getElementById('newBookingName').value = '';
            document.getElementById('newBookingEmail').value = '';
            document.getElementById('newBookingPhone').value = '';
            document.getElementById('newBookingDate').value = '';
            document.getElementById('newBookingGuests').value = '';
            document.getElementById('newBookingAmount').value = '';
            document.getElementById('newBookingNotes').value = '';
            
            // Sync calendar to show new booking
            await syncCalendar();
            
            // Switch to bookings view
            showSection('bookings');
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        Toast.show('Failed to create booking: ' + (error.result?.error?.message || error.message), 'error');
    } finally {
        state.setLoading(false);
    }
}

// Expose new functions
window.copyBookingUrl = copyBookingUrl;
window.openNewBookingModal = openNewBookingModal;
window.createManualBooking = createManualBooking;
