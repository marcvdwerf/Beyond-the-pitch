// ===============================
// AUTH CHECK
// ===============================
console.log("🚀 Partner Dashboard Loading...");
checkAuth("partner");

const userEmail = localStorage.getItem("userEmail");

// ===============================
// GOOGLE CALENDAR CONFIG
// ===============================
const GOOGLE_CONFIG = {
    CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // TODO: Add your client ID
    API_KEY: 'YOUR_API_KEY', // TODO: Add your API key
    SCOPES: 'https://www.googleapis.com/auth/calendar',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
};

let gapiInited = false;
let gisInited = false;
let tokenClient;
let isGoogleAuthed = false;

// ===============================
// PARTNER DATA
// ===============================
const partnerData = {
    email: userEmail,
    companyName: "Peru Adventure Co.",
    country: "🇵🇪 Peru",
    location: "Lima, Peru",
    calendarId: "primary",
    bookings: [],
    experiences: [
        { id: 1, title: "Machu Picchu Hike", type: "Trek", price: 200, rating: 4.8, bookings: 18 },
        { id: 2, title: "Cusco City Tour", type: "City", price: 125, rating: 4.5, bookings: 34 },
        { id: 3, title: "Sacred Valley", type: "Cultural", price: 150, rating: 4.9, bookings: 24 },
        { id: 4, title: "Lima Food Tour", type: "Culinary", price: 90, rating: 4.7, bookings: 42 }
    ],
    messages: [
        { from: "Beyond the Pitch", subject: "Welcome!", message: "We're excited to have you as a partner!", date: "2026-01-15", read: true },
        { from: "Beyond the Pitch", subject: "New booking", message: "You have a new booking from John Smith.", date: "2026-01-20", read: false }
    ]
};

// ===============================
// DEMO DATA (fallback)
// ===============================
const demoBookings = [
    { id: "BTP-1001", experienceName: "Machu Picchu Hike", customer: "John Smith", date: "2026-02-10", guests: 4, status: "confirmed", amount: 800 },
    { id: "BTP-1002", experienceName: "Cusco City Tour", customer: "Emily Clark", date: "2026-02-14", guests: 2, status: "pending", amount: 250 },
    { id: "BTP-1003", experienceName: "Sacred Valley", customer: "Michael Johnson", date: "2026-02-20", guests: 3, status: "confirmed", amount: 450 },
    { id: "BTP-1004", experienceName: "Lima Food Tour", customer: "Sarah Williams", date: "2026-02-25", guests: 2, status: "confirmed", amount: 180 }
];

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    console.log("📊 Loading partner data...");
    loadGoogleAPI();
    loadPartnerData();
    
    // Auto-refresh every 2 minutes if connected
    setInterval(() => {
        if (isGoogleAuthed) {
            fetchCalendarBookings(false);
        }
    }, 120000);
});

// ===============================
// GOOGLE API INITIALIZATION
// ===============================
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
            apiKey: GOOGLE_CONFIG.API_KEY,
            discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC],
        });
        gapiInited = true;
        console.log('✅ Google API Client initialized');
        maybeEnableButtons();
    } catch (error) {
        console.error('Error initializing Google API:', error);
        showGoogleStatus('error', 'Failed to initialize Google API');
    }
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    console.log('✅ Google Identity Services initialized');
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('connectGoogleBtn')?.removeAttribute('disabled');
        showGoogleStatus('ready', 'Ready to connect Google Calendar');
    }
}

// ===============================
// GOOGLE CALENDAR CONNECTION
// ===============================
function connectGoogleCalendar() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        isGoogleAuthed = true;
        console.log('✅ Google Calendar connected');
        showGoogleStatus('connected', 'Google Calendar connected');
        document.getElementById('connectGoogleSection')?.classList.add('hidden');
        document.getElementById('connectedGoogleSection')?.classList.remove('hidden');
        await fetchCalendarBookings(true);
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function showGoogleStatus(type, message) {
    const statusEl = document.getElementById('googleStatus');
    if (!statusEl) return;

    const icons = {
        ready: '🔵',
        connected: '✅',
        syncing: '🔄',
        error: '❌'
    };

    const colors = {
        ready: 'background:#fef3c7; color:#92400e; border-color:#fbbf24;',
        connected: 'background:#d1fae5; color:#065f46; border-color:#10b981;',
        syncing: 'background:#dbeafe; color:#1e40af; border-color:#3b82f6;',
        error: 'background:#fee2e2; color:#991b1b; border-color:#ef4444;'
    };

    statusEl.innerHTML = `
        <div style="padding:15px; border-radius:10px; ${colors[type]} border:2px solid; margin-bottom:20px;">
            <strong>${icons[type]} ${message}</strong>
        </div>
    `;
}

// ===============================
// FETCH BOOKINGS FROM GOOGLE CALENDAR
// ===============================
async function fetchCalendarBookings(showLoading = true) {
    if (showLoading) {
        showGoogleStatus('syncing', 'Syncing with Google Calendar...');
    }

    try {
        const response = await gapi.client.calendar.events.list({
            'calendarId': partnerData.calendarId,
            'timeMin': (new Date()).toISOString(),
            'maxResults': 50,
            'singleEvents': true,
            'orderBy': 'startTime'
        });

        const events = response.result.items;
        
        // Filter and parse booking events
        partnerData.bookings = events
            .filter(event => event.summary && event.summary.includes('BTP-'))
            .map(event => parseBookingFromEvent(event));

        console.log(`✅ Synced ${partnerData.bookings.length} bookings from Google Calendar`);
        
        if (showLoading) {
            const now = new Date();
            showGoogleStatus('connected', `Last synced: ${now.toLocaleTimeString('en-GB')}`);
        }
        
        updateLastSyncTime();
        loadBookings();
        updateStats();
        
    } catch (error) {
        console.error('Error fetching calendar bookings:', error);
        showGoogleStatus('error', 'Failed to sync. Using demo data.');
        partnerData.bookings = demoBookings;
        loadBookings();
        updateStats();
    }
}

function parseBookingFromEvent(event) {
    const description = event.description || '';
    const lines = description.split('\n').map(l => l.trim());
    
    const getField = (fieldName) => {
        const line = lines.find(l => l.startsWith(fieldName + ':'));
        return line ? line.split(':').slice(1).join(':').trim() : '';
    };

    // Extract booking ID from summary (e.g., "BTP-1001 - Machu Picchu")
    const bookingId = event.summary.match(/BTP-\d+/)?.[0] || 'BTP-XXXX';
    
    return {
        id: bookingId,
        experienceName: getField('Experience') || event.summary.replace(/BTP-\d+\s*-?\s*/, '').trim(),
        customer: getField('Customer') || 'Unknown',
        date: event.start.dateTime || event.start.date,
        guests: parseInt(getField('Guests')) || 1,
        status: event.status === 'confirmed' ? 'confirmed' : 'pending',
        amount: parseFloat(getField('Amount')?.replace('€', '').replace(',', '')) || 0,
        eventId: event.id
    };
}

function updateLastSyncTime() {
    const timeEl = document.getElementById('lastSyncTime');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('en-GB');
    }
}

// ===============================
// MANUAL REFRESH
// ===============================
async function refreshBookings() {
    if (!isGoogleAuthed) {
        alert('Please connect Google Calendar first');
        return;
    }
    await fetchCalendarBookings(true);
}

// ===============================
// UPDATE BOOKING STATUS
// ===============================
async function updateBookingStatus(bookingId, newStatus) {
    if (!isGoogleAuthed) {
        alert('Please connect Google Calendar first to update bookings');
        return;
    }

    const booking = partnerData.bookings.find(b => b.id === bookingId);
    if (!booking || !booking.eventId) {
        alert('Booking not found in calendar');
        return;
    }

    try {
        // Get the event
        const eventResponse = await gapi.client.calendar.events.get({
            'calendarId': partnerData.calendarId,
            'eventId': booking.eventId
        });

        const event = eventResponse.result;
        
        // Update description to reflect new status
        let description = event.description || '';
        description = description.replace(/Status:.*$/m, `Status: ${newStatus}`);
        if (!description.includes('Status:')) {
            description += `\nStatus: ${newStatus}`;
        }

        // Update the event
        await gapi.client.calendar.events.update({
            'calendarId': partnerData.calendarId,
            'eventId': booking.eventId,
            'resource': {
                ...event,
                status: newStatus === 'confirmed' ? 'confirmed' : 'tentative',
                description: description
            }
        });

        console.log(`✅ Updated booking ${bookingId} to ${newStatus}`);
        await fetchCalendarBookings(true);
        
    } catch (error) {
        console.error('Error updating booking:', error);
        alert('Failed to update booking. Please try again.');
    }
}

// ===============================
// LOAD DATA
// ===============================
function loadPartnerData() {
    document.getElementById("partnerName").textContent = partnerData.companyName;
    document.getElementById("partnerCountry").textContent = partnerData.country;
    document.getElementById("welcomeText").textContent = `Welcome, ${partnerData.companyName}!`;

    // Use demo data initially
    partnerData.bookings = demoBookings;
    
    updateStats();
    loadBookings();
    loadExperiences();
    loadMessages();
    
    console.log("✅ Partner data loaded!");
}

function updateStats() {
    const totalBookings = partnerData.bookings.length;
    const activeExperiences = partnerData.experiences.length;
    const avgRating = (partnerData.experiences.reduce((sum, e) => sum + e.rating, 0) / activeExperiences).toFixed(1);
    const totalGuests = partnerData.bookings.reduce((sum, b) => sum + b.guests, 0);

    document.getElementById("totalBookings").textContent = totalBookings;
    document.getElementById("activeExperiences").textContent = activeExperiences;
    document.getElementById("avgRating").textContent = avgRating;
    document.getElementById("totalGuests").textContent = totalGuests;
}

// ===============================
// NAVIGATION
// ===============================
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}
window.showSection = showSection;

// ===============================
// BOOKINGS
// ===============================
function loadBookings() {
    const tbody = document.getElementById("allBookings");
    tbody.innerHTML = partnerData.bookings.map(b => `
        <tr>
            <td><strong>${b.id}</strong></td>
            <td>${b.experienceName}</td>
            <td>${b.customer}</td>
            <td>${new Date(b.date).toLocaleDateString("en-GB")}</td>
            <td>${b.guests}</td>
            <td><span class="badge badge-${b.status}">${b.status === "confirmed" ? "Confirmed" : "Pending"}</span></td>
            <td><strong>€${b.amount}</strong></td>
            <td>
                ${b.status === 'pending' ? `<button onclick="updateBookingStatus('${b.id}', 'confirmed')" style="padding:6px 12px; background:#10b981; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.85rem;">Confirm</button>` : ''}
            </td>
        </tr>
    `).join("");
}

// ===============================
// EXPERIENCES
// ===============================
function loadExperiences() {
    const grid = document.getElementById("experiencesGrid");
    grid.innerHTML = partnerData.experiences.map(exp => `
        <div style="border:2px solid #e0e0e0; border-radius:15px; padding:20px; margin-bottom:15px;">
            <h3 style="color:#333;">${exp.title}</h3>
            <p style="color:#888; margin:10px 0;">${exp.type}</p>
            <div style="display:flex; justify-content:space-between; margin:10px 0;">
                <span><strong>€${exp.price}</strong> per person</span>
                <span>⭐ ${exp.rating}</span>
            </div>
            <p style="color:#666; font-size:0.9rem;">${exp.bookings} bookings</p>
        </div>
    `).join("");
}

// ===============================
// MESSAGES
// ===============================
function loadMessages() {
    const container = document.getElementById("messagesContainer");
    container.innerHTML = partnerData.messages.map(m => `
        <div style="background:${m.read ? '#f8f9fa' : '#e3f2fd'}; padding:20px; border-radius:10px; margin-bottom:15px; border-left:4px solid ${m.read ? '#e0e0e0' : '#667eea'};">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <strong>${m.from}</strong>
                <span style="color:#888; font-size:0.9rem;">${new Date(m.date).toLocaleDateString("en-GB")}</span>
            </div>
            <h4 style="color:#667eea; margin-bottom:10px;">${m.subject}</h4>
            <p style="color:#666;">${m.message}</p>
            ${!m.read ? '<span style="color:#667eea; font-weight:600;">● NEW</span>' : ''}
        </div>
    `).join("");
}

// Make functions globally available
window.connectGoogleCalendar = connectGoogleCalendar;
window.refreshBookings = refreshBookings;
window.updateBookingStatus = updateBookingStatus;
