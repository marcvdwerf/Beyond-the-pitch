// ===============================
// CONFIGURATION
// ===============================
const CONFIG = {
    CLIENT_ID: '440103208396-uou0t99knmu2a7dd4ieadvmtlcu47k3g.apps.googleusercontent.com',
    API_KEY: 'YOUR_API_KEY_HERE', // TODO: Vervang met jouw API key van Google Cloud Console
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar.readonly'
};

// ===============================
// STATE
// ===============================
let tokenClient;
let gapiInited = false;
let gisInited = false;
let currentCalendarId = 'primary';
let bookingsData = [];

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Partner Dashboard...');
    loadPartnerInfo();
    loadGoogleAPI();
});

function loadGoogleAPI() {
    // Load Google API client
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = gapiLoaded;
    document.body.appendChild(gapiScript);

    // Load Google Identity Services
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = gisLoaded;
    document.body.appendChild(gisScript);
}

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: CONFIG.API_KEY,
            discoveryDocs: [CONFIG.DISCOVERY_DOC],
        });
        gapiInited = true;
        console.log('✅ Google API Client initialized');
        maybeEnableButtons();
    } catch (error) {
        console.error('❌ Error initializing GAPI:', error);
        showStatus('error', 'Failed to initialize Google API. Please check your API key.');
    }
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    console.log('✅ Google Identity Services initialized');
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        const btn = document.getElementById('connectGoogleBtn');
        if (btn) {
            btn.disabled = false;
            const btnText = document.getElementById('connectBtnText');
            if (btnText) btnText.textContent = 'Connect Calendar';
        }
        
        // Check if already authorized
        if (gapi.client.getToken()) {
            updateUIForSignedIn();
            loadCalendarList();
            syncCalendar();
        }
    }
}

// ===============================
// AUTHENTICATION
// ===============================
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error('❌ Auth error:', resp);
            showStatus('error', 'Authentication failed: ' + resp.error);
            return;
        }
        console.log('✅ Successfully authenticated');
        showStatus('success', 'Successfully connected to Google Calendar!');
        updateUIForSignedIn();
        await loadCalendarList();
        await syncCalendar();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        updateUIForSignedOut();
        showStatus('info', 'Disconnected from Google Calendar');
    }
}

function updateUIForSignedIn() {
    const connectSection = document.getElementById('connectGoogleSection');
    const connectedSection = document.getElementById('connectedGoogleSection');
    
    if (connectSection) connectSection.classList.add('hidden');
    if (connectedSection) connectedSection.classList.remove('hidden');
}

function updateUIForSignedOut() {
    const connectSection = document.getElementById('connectGoogleSection');
    const connectedSection = document.getElementById('connectedGoogleSection');
    
    if (connectSection) connectSection.classList.remove('hidden');
    if (connectedSection) connectedSection.classList.add('hidden');
    
    bookingsData = [];
    updateStats();
    renderBookingsTable();
}

// ===============================
// CALENDAR OPERATIONS
// ===============================
async function loadCalendarList() {
    try {
        const response = await gapi.client.calendar.calendarList.list();
        const calendars = response.result.items;
        
        console.log(`📅 Found ${calendars.length} calendars`);
        
        const select = document.getElementById('calendarSelect');
        if (select) {
            select.innerHTML = calendars.map(cal => 
                `<option value="${cal.id}" ${cal.id === currentCalendarId ? 'selected' : ''}>
                    ${cal.summary} ${cal.primary ? '(Primary)' : ''}
                </option>`
            ).join('');
        }
        
        // Update connected calendar name
        const selectedCal = calendars.find(c => c.id === currentCalendarId);
        if (selectedCal) {
            const nameEl = document.getElementById('connectedCalendarName');
            if (nameEl) nameEl.textContent = selectedCal.summary;
        }
    } catch (error) {
        console.error('❌ Error loading calendars:', error);
        showStatus('error', 'Failed to load calendar list');
    }
}

async function syncCalendar() {
    const syncBtn = document.getElementById('syncBtn');
    const refreshBtn = document.getElementById('refreshBookingsBtn');
    
    try {
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<span>⏳</span> Syncing...';
        }
        if (refreshBtn) refreshBtn.disabled = true;
        
        showStatus('info', 'Syncing with Google Calendar...');

        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const response = await gapi.client.calendar.events.list({
            calendarId: currentCalendarId,
            timeMin: threeMonthsAgo.toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.result.items || [];
        console.log(`📅 Found ${events.length} total calendar events`);

        // Parse booking events (events with "BTP-" in title)
        bookingsData = events
            .filter(event => event.summary && event.summary.includes('BTP-'))
            .map(event => parseBookingEvent(event));

        console.log(`✅ Parsed ${bookingsData.length} booking events`);

        updateStats();
        renderBookingsTable();
        updateLastSyncTime();
        showStatus('success', `Successfully synced ${bookingsData.length} bookings from Google Calendar`);

    } catch (error) {
        console.error('❌ Sync error:', error);
        const errorMsg = error.result?.error?.message || error.message || 'Unknown error';
        showStatus('error', `Failed to sync calendar: ${errorMsg}`);
    } finally {
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<span>🔄</span> Sync Now';
        }
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

function parseBookingEvent(event) {
    const summary = event.summary || '';
    const description = event.description || '';
    
    // Extract booking ID from title (e.g., "BTP-1001")
    const bookingIdMatch = summary.match(/BTP-\d+/);
    const bookingId = bookingIdMatch ? bookingIdMatch[0] : 'BTP-XXXX';
    
    // Extract experience name (everything after "BTP-1001 - ")
    const experienceName = summary.replace(/BTP-\d+\s*-?\s*/, '').trim() || 'Unknown Experience';
    
    // Parse description fields
    const getField = (fieldName) => {
        const regex = new RegExp(`${fieldName}:\\s*(.+)`, 'i');
        const match = description.match(regex);
        return match ? match[1].trim() : '';
    };

    // Parse date
    const startDate = event.start.dateTime || event.start.date;
    const endDate = event.end?.dateTime || event.end?.date;
    
    // Parse amount (support multiple formats: €800, $800, 800)
    const amountStr = getField('Amount') || getField('Price') || getField('Total') || '0';
    const amount = parseFloat(amountStr.replace(/[€$£,]/g, '')) || 0;
    
    // Parse guests
    const guestsStr = getField('Guests') || getField('Participants') || getField('People') || '1';
    const guests = parseInt(guestsStr) || 1;
    
    // Determine status
    let status = 'pending';
    const statusField = getField('Status').toLowerCase();
    if (event.status === 'confirmed' || statusField === 'confirmed') {
        status = 'confirmed';
    } else if (event.status === 'cancelled' || statusField === 'cancelled') {
        status = 'cancelled';
    }

    return {
        id: bookingId,
        eventId: event.id,
        experienceName,
        customer: getField('Customer') || getField('Name') || getField('Guest') || 'Unknown',
        email: getField('Email') || getField('E-mail') || '',
        phone: getField('Phone') || getField('Tel') || '',
        date: startDate,
        endDate,
        guests,
        status,
        amount,
        description: description,
        calendarLink: event.htmlLink,
        location: event.location || ''
    };
}

function saveCalendarSettings() {
    const select = document.getElementById('calendarSelect');
    if (select) {
        currentCalendarId = select.value;
        localStorage.setItem('selectedCalendarId', currentCalendarId);
        showStatus('success', 'Calendar settings saved! Syncing...');
        loadCalendarList();
        syncCalendar();
    }
}

// ===============================
// UI UPDATES
// ===============================
function updateStats() {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const totalBookings = bookingsData.length;
    const upcomingBookings = bookingsData.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= now && bookingDate <= thirtyDaysFromNow && b.status !== 'cancelled';
    }).length;
    const totalGuests = bookingsData.reduce((sum, b) => sum + (b.guests || 0), 0);
    const totalRevenue = bookingsData.reduce((sum, b) => sum + (b.amount || 0), 0);

    // Update stat cards
    const setTextContent = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setTextContent('totalBookings', totalBookings);
    setTextContent('upcomingBookings', upcomingBookings);
    setTextContent('totalGuests', totalGuests);
    setTextContent('totalRevenue', `€${totalRevenue.toFixed(0)}`);

    // Update change indicators
    setTextContent('bookingsChange', totalBookings > 0 ? 'Synced from calendar' : 'No bookings yet');
    setTextContent('guestsChange', totalGuests > 0 ? `Avg: ${(totalGuests/totalBookings || 0).toFixed(1)} per booking` : '--');
    setTextContent('revenueChange', totalRevenue > 0 ? `Avg: €${(totalRevenue/totalBookings || 0).toFixed(0)} per booking` : '--');
}

function renderBookingsTable() {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;
    
    if (bookingsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p style="font-size:1.1rem; margin-bottom:10px;">📅 No bookings found</p>
                <p>Create calendar events with "BTP-" in the title to see them here</p>
                <p style="margin-top:15px; color:#667eea;">Example: "BTP-1001 - Machu Picchu Trek"</p>
            </div>
        `;
        return;
    }

    // Sort by date (most recent first)
    const sortedBookings = [...bookingsData].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Booking ID</th>
                    <th>Experience</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Guests</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${sortedBookings.map(b => `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>
                            ${b.experienceName}
                            ${b.location ? `<br><small style="color:#888;">📍 ${b.location}</small>` : ''}
                        </td>
                        <td>
                            ${b.customer}
                            ${b.email ? `<br><small style="color:#888;">✉️ ${b.email}</small>` : ''}
                            ${b.phone ? `<br><small style="color:#888;">📞 ${b.phone}</small>` : ''}
                        </td>
                        <td>${formatDate(b.date)}</td>
                        <td>${b.guests}</td>
                        <td><span class="badge badge-${b.status}">${capitalizeFirst(b.status)}</span></td>
                        <td><strong>€${b.amount.toFixed(0)}</strong></td>
                        <td>
                            <a href="${b.calendarLink}" target="_blank" style="color:#667eea; text-decoration:none; font-size:0.9rem;">
                                📅 Open
                            </a>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateLastSyncTime() {
    const timeEl = document.getElementById('lastSyncTime');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// ===============================
// NAVIGATION
// ===============================
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

// ===============================
// STATUS MESSAGES
// ===============================
function showStatus(type, message) {
    const container = document.getElementById('statusContainer');
    if (!container) return;
    
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    container.innerHTML = `
        <div class="status-message ${type}">
            <span style="font-size:1.2rem;">${icons[type]}</span>
            <span>${message}</span>
        </div>
    `;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

// ===============================
// UTILITY FUNCTIONS
// ===============================
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset time parts for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() === today.getTime()) {
        return '🔴 Today - ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } else if (compareDate.getTime() === tomorrow.getTime()) {
        return '🟡 Tomorrow - ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function loadPartnerInfo() {
    // Load partner info from localStorage or set defaults
    const partnerName = localStorage.getItem('partnerName') || 'Peru Adventure Co.';
    const partnerEmail = localStorage.getItem('partnerEmail') || 'partner@travelbeyondthepitch.com';
    
    const setTextContent = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    setTextContent('partnerName', partnerName);
    setTextContent('partnerEmail', partnerEmail);
    setTextContent('welcomeText', `Welcome, ${partnerName}!`);
    
    // Load saved calendar preference
    const savedCalendarId = localStorage.getItem('selectedCalendarId');
    if (savedCalendarId) {
        currentCalendarId = savedCalendarId;
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Sign out from Google
        if (gapi && gapi.client && gapi.client.getToken() !== null) {
            handleSignoutClick();
        }
        // Clear localStorage
        localStorage.removeItem('partnerName');
        localStorage.removeItem('partnerEmail');
        localStorage.removeItem('selectedCalendarId');
        // Redirect to login page (or reload)
        window.location.href = 'login.html';
    }
}

// ===============================
// MAKE FUNCTIONS GLOBAL
// ===============================
window.handleAuthClick = handleAuthClick;
window.handleSignoutClick = handleSignoutClick;
window.syncCalendar = syncCalendar;
window.showSection = showSection;
window.saveCalendarSettings = saveCalendarSettings;
window.logout = logout;

// ===============================
// AUTO-SYNC (Optional)
// ===============================
// Uncomment to enable auto-sync every 5 minutes
/*
setInterval(() => {
    if (gapi && gapi.client && gapi.client.getToken() !== null) {
        console.log('🔄 Auto-syncing...');
        syncCalendar();
    }
}, 300000); // 5 minutes
*/

console.log('✅ Partner Dashboard JavaScript loaded');
