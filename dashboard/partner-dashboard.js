// ===============================
// CONFIGURATION
// ===============================
const CONFIG = {
    CLIENT_ID: '440103208396-uou0t99knmu2a7dd4ieadvmtlcu47k3g.apps.googleusercontent.com',
    API_KEY: 'YOUR_API_KEY_HERE', 
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
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = gapiLoaded;
    document.body.appendChild(gapiScript);

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
        maybeEnableButtons();
    } catch (error) {
        console.error('❌ Error initializing GAPI:', error);
    }
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: '', 
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        const btn = document.getElementById('connectGoogleBtn');
        if (btn) {
            btn.disabled = false;
            document.getElementById('connectBtnText').textContent = 'Connect Google Calendar';
        }
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
        if (resp.error !== undefined) throw (resp);
        updateUIForSignedIn();
        await loadCalendarList();
        await syncCalendar();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        updateUIForSignedOut();
    }
}

function updateUIForSignedIn() {
    document.getElementById('connectGoogleSection').classList.add('hidden');
    document.getElementById('connectedGoogleSection').classList.remove('hidden');
}

function updateUIForSignedOut() {
    document.getElementById('connectGoogleSection').classList.remove('hidden');
    document.getElementById('connectedGoogleSection').classList.add('hidden');
    bookingsData = [];
    renderBookingsTable();
}

// ===============================
// CORE FUNCTIONALITY: SHOW DETAIL
// ===============================
function showBookingDetail(bookingId) {
    const booking = bookingsData.find(b => b.id === bookingId);
    const detailContainer = document.getElementById('day-detail');
    
    if (!booking) return;

    detailContainer.innerHTML = `
        <div class="card detail-card" style="margin-bottom: 30px; border-left: 5px solid #667eea;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="margin-bottom:10px;">Details for ${booking.id}</h2>
                    <p style="font-size:1.1rem; margin-bottom:5px;"><strong>Experience:</strong> ${booking.experienceName}</p>
                    <p><strong>Date:</strong> ${formatDate(booking.date)}</p>
                </div>
                <button onclick="document.getElementById('day-detail').innerHTML=''" style="background:none; border:none; cursor:pointer; font-size:1.5rem;">✕</button>
            </div>
            <hr style="margin:15px 0; opacity:0.1;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div>
                    <h4 style="color:#667eea; margin-bottom:8px;">Customer Information</h4>
                    <p>👤 ${booking.customer}</p>
                    <p>✉️ ${booking.email || 'No email'}</p>
                    <p>📞 ${booking.phone || 'No phone'}</p>
                </div>
                <div>
                    <h4 style="color:#667eea; margin-bottom:8px;">Booking Info</h4>
                    <p>👥 Guests: ${booking.guests}</p>
                    <p>💰 Amount: €${booking.amount}</p>
                    <p>📍 Location: ${booking.location || 'N/A'}</p>
                </div>
            </div>
            ${booking.description ? `
                <div style="margin-top:15px; padding:10px; background:#f8f9fa; border-radius:8px; font-size:0.9rem;">
                    <strong>Notes/Description:</strong><br>${booking.description.replace(/\n/g, '<br>')}
                </div>
            ` : ''}
        </div>
    `;
    
    detailContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===============================
// CALENDAR OPERATIONS
// ===============================
async function loadCalendarList() {
    try {
        const response = await gapi.client.calendar.calendarList.list();
        const calendars = response.result.items;
        const select = document.getElementById('calendarSelect');
        if (select) {
            select.innerHTML = calendars.map(cal => 
                `<option value="${cal.id}" ${cal.id === currentCalendarId ? 'selected' : ''}>${cal.summary}</option>`
            ).join('');
        }
    } catch (e) { console.error(e); }
}

async function syncCalendar() {
    try {
        showStatus('info', 'Fetching bookings...');
        const now = new Date();
        const response = await gapi.client.calendar.events.list({
            calendarId: currentCalendarId,
            timeMin: new Date(now.setMonth(now.getMonth() - 2)).toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.result.items || [];
        bookingsData = events
            .filter(e => e.summary && e.summary.includes('BTP-'))
            .map(e => parseBookingEvent(e));

        updateStats();
        renderBookingsTable();
        updateLastSyncTime();
        showStatus('success', `${bookingsData.length} bookings synchronized.`);
    } catch (e) {
        showStatus('error', 'Sync failed');
    }
}

function parseBookingEvent(event) {
    const desc = event.description || '';
    const getF = (key) => {
        const m = desc.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
        return m ? m[1].trim() : '';
    };

    return {
        id: (event.summary.match(/BTP-\d+/) || ['BTP-???'])[0],
        experienceName: event.summary.replace(/BTP-\d+\s*-?\s*/, '').trim(),
        customer: getF('Customer') || getF('Name') || 'Unknown',
        email: getF('Email'),
        phone: getF('Phone'),
        date: event.start.dateTime || event.start.date,
        guests: parseInt(getF('Guests')) || 1,
        status: (getF('Status') || 'confirmed').toLowerCase(),
        amount: parseFloat((getF('Amount') || '0').replace(/[^\d.]/g, '')) || 0,
        description: desc,
        location: event.location,
        calendarLink: event.htmlLink
    };
}

// ===============================
// UI RENDERING
// ===============================
function renderBookingsTable() {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;
    
    if (bookingsData.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">No bookings found. Ensure events start with "BTP-".</div>';
        return;
    }

    const sorted = [...bookingsData].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Experience</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(b => `
                    <tr onclick="showBookingDetail('${b.id}')" style="cursor:pointer;">
                        <td><strong>${b.id}</strong></td>
                        <td>${b.experienceName}</td>
                        <td>${b.customer}</td>
                        <td>${formatDate(b.date)}</td>
                        <td><span class="badge badge-${b.status}">${b.status}</span></td>
                        <td>€${b.amount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateStats() {
    const total = bookingsData.length;
    const revenue = bookingsData.reduce((sum, b) => sum + b.amount, 0);
    const guests = bookingsData.reduce((sum, b) => sum + b.guests, 0);

    document.getElementById('totalBookings').textContent = total;
    document.getElementById('totalGuests').textContent = guests;
    document.getElementById('totalRevenue').textContent = `€${revenue}`;
}

// ===============================
// UTILITIES & NAVIGATION
// ===============================
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

function formatDate(ds) {
    const d = new Date(ds);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function showStatus(type, msg) {
    const container = document.getElementById('statusContainer');
    container.innerHTML = `<div class="card" style="padding:10px; background:${type==='success'?'#d1fae5':'#fef3c7'}">${msg}</div>`;
    if(type === 'success') setTimeout(() => container.innerHTML = '', 4000);
}

function updateLastSyncTime() {
    document.getElementById('lastSyncTime').textContent = new Date().toLocaleTimeString();
}

function loadPartnerInfo() {
    document.getElementById('partnerName').textContent = 'My Football Experience';
    document.getElementById('partnerEmail').textContent = 'info@partner.com';
    document.getElementById('welcomeText').textContent = 'Welcome, Partner';
}

function logout() {
    if(confirm("Are you sure you want to log out?")) location.reload();
}

function saveCalendarSettings() {
    currentCalendarId = document.getElementById('calendarSelect').value;
    showStatus('success', 'Settings saved. Syncing...');
    syncCalendar();
}

// Global exposure
window.handleAuthClick = handleAuthClick;
window.handleSignoutClick = handleSignoutClick;
window.syncCalendar = syncCalendar;
window.showSection = showSection;
window.showBookingDetail = showBookingDetail;
window.saveCalendarSettings = saveCalendarSettings;
window.logout = logout;
