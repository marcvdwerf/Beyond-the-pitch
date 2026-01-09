/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Version: 2.7 (Fixed Detail View & Experience Loader)
 */

const CONFIG = {
    CLIENT_ID: '440103208396-uou0t99knmu2a7dd4ieadvmtlcu47k3g.apps.googleusercontent.com',
    API_KEY: 'AIzaSyA2rnwUC3x2OZzwqULdgvkkcyEK1uKqI34', 
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar.readonly'
};

let tokenClient;
let gapiInited = false;
let gisInited = false;
let currentCalendarId = 'primary';
let bookingsData = [];

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    loadPartnerInfo();
    loadGoogleAPI();
});

function loadGoogleAPI() {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => gapi.load('client', initializeGapiClient);
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.CLIENT_ID,
            scope: CONFIG.SCOPES,
            callback: '', 
        });
        gisInited = true;
        maybeEnableButtons();
    };
    document.body.appendChild(gisScript);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: CONFIG.API_KEY,
            discoveryDocs: [CONFIG.DISCOVERY_DOC],
        });
        gapiInited = true;
        maybeEnableButtons();
    } catch (e) { console.error('GAPI Init Error:', e); }
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
            syncCalendar();
        }
    }
}

// ===============================
// SYNC & DATA LOGIC
// ===============================
async function syncCalendar() {
    try {
        showStatus('info', 'Connecting to Google...');
        const now = new Date();
        const response = await gapi.client.calendar.events.list({
            calendarId: currentCalendarId,
            timeMin: new Date(now.setMonth(now.getMonth() - 3)).toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.result.items || [];
        bookingsData = events
            .filter(e => e.summary && e.summary.toUpperCase().includes('BTP'))
            .map(e => parseBookingEvent(e));

        updateStats();
        renderBookingsTable();
        renderExperiences(); // Ververs ook de experiences tab
        updateLastSyncTime();
        
        showStatus('success', `${bookingsData.length} bookings synchronized.`);
    } catch (e) {
        showStatus('error', 'Sync failed. Try to reconnect.');
    }
}

function parseBookingEvent(event) {
    const desc = event.description || '';
    const getF = (key) => {
        const m = desc.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
        return m ? m[1].trim() : '';
    };

    const idMatch = event.summary.match(/BTP-?\d+/i);
    return {
        id: idMatch ? idMatch[0].toUpperCase() : 'BTP-???',
        experienceName: event.summary.replace(/BTP-?\d+\s*-?\s*/i, '').trim() || 'Experience',
        customer: getF('Customer') || getF('Name') || 'Guest',
        email: getF('Email') || 'N/A',
        phone: getF('Phone') || 'N/A',
        date: event.start.dateTime || event.start.date,
        guests: parseInt(getF('Guests')) || 1,
        status: (getF('Status') || 'confirmed').toLowerCase(),
        amount: parseFloat((getF('Amount') || '0').replace(/[^\d.]/g, '')) || 0,
        description: desc,
        location: event.location || 'Lima, Peru'
    };
}

// ===============================
// UI RENDERING
// ===============================
function renderBookingsTable() {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;
    
    if (bookingsData.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">No BTP bookings found.</p>`;
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
                    <tr onclick="showBookingDetail('${b.id}')">
                        <td><strong>${b.id}</strong></td>
                        <td>${b.experienceName}</td>
                        <td>${b.customer}</td>
                        <td>${formatDate(b.date)}</td>
                        <td><span class="badge badge-${b.status}">${b.status}</span></td>
                        <td>€${b.amount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

/**
 * Toont de details van een boeking wanneer je op een rij klikt
 */
function showBookingDetail(bookingId) {
    const booking = bookingsData.find(b => b.id === bookingId);
    const detailContainer = document.getElementById('day-detail');
    if (!booking || !detailContainer) return;

    detailContainer.innerHTML = `
        <div class="card" style="border-left: 5px solid #667eea; margin-top:20px; animation: fadeIn 0.3s;">
            <div style="display:flex; justify-content:space-between;">
                <h2>Booking Details: ${booking.id}</h2>
                <button onclick="document.getElementById('day-detail').innerHTML=''" style="border:none; background:none; cursor:pointer; font-size:1.2rem;">✕</button>
            </div>
            <hr style="margin:15px 0; opacity:0.1;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div>
                    <p><strong>Customer:</strong> ${booking.customer}</p>
                    <p><strong>Email:</strong> ${booking.email}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                </div>
                <div>
                    <p><strong>Experience:</strong> ${booking.experienceName}</p>
                    <p><strong>Guests:</strong> ${booking.guests}</p>
                    <p><strong>Location:</strong> ${booking.location}</p>
                </div>
            </div>
        </div>`;
    detailContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Laadt de statische lijst met ervaringen
 */
function renderExperiences() {
    const container = document.getElementById('experience-container');
    if (!container) return;

    const experiences = [
        { title: "Full Day Package", price: "€120 - €200", info: "Hidden Spots & Football" },
        { title: "Two Days, One Night", price: "€150 - €200", info: "Culture & Coastal" },
        { title: "Three Days, Two Nights", price: "€100 - €200 / day", info: "Complete Lima Experience" }
    ];

    container.innerHTML = experiences.map(exp => `
        <div class="exp-card">
            <div class="exp-banner">${exp.title}</div>
            <div class="exp-body">
                <p><strong>Price:</strong> ${exp.price}</p>
                <p>${exp.info}</p>
            </div>
        </div>
    `).join('');
}

// ===============================
// AUTH & UTILS
// ===============================
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        updateUIForSignedIn();
        syncCalendar();
    };
    tokenClient.requestAccessToken({ prompt: 'select_account' });
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        updateUIForSignedOut();
    }
}

function forceLogout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

function updateStats() {
    const total = bookingsData.length;
    const revenue = bookingsData.reduce((sum, b) => sum + b.amount, 0);
    if (document.getElementById('totalBookings')) document.getElementById('totalBookings').textContent = total;
    if (document.getElementById('totalRevenue')) document.getElementById('totalRevenue').textContent = `€${revenue}`;
}

function showStatus(type, msg) {
    const container = document.getElementById('statusContainer');
    if (!container) return;
    const colors = { success: '#d1fae5', error: '#fee2e2', info: '#dbeafe' };
    container.innerHTML = `<div style="padding:15px; margin-bottom:20px; border-radius:8px; background:${colors[type] || '#eee'}">${msg}</div>`;
}

function formatDate(ds) {
    const d = new Date(ds);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function updateLastSyncTime() {
    if (document.getElementById('lastSyncTime')) 
        document.getElementById('lastSyncTime').textContent = new Date().toLocaleTimeString();
}

function loadPartnerInfo() {
    const name = localStorage.getItem('userName') || 'Partner';
    if (document.getElementById('partnerName')) document.getElementById('partnerName').textContent = name;
    if (document.getElementById('welcomeText')) document.getElementById('welcomeText').textContent = `Welcome, ${name}`;
    if (document.getElementById('partnerEmail')) document.getElementById('partnerEmail').textContent = localStorage.getItem('userEmail') || '';
}

function updateUIForSignedIn() {
    document.getElementById('connectGoogleSection').classList.add('hidden');
    document.getElementById('connectedGoogleSection').classList.remove('hidden');
}

function updateUIForSignedOut() {
    document.getElementById('connectGoogleSection').classList.remove('hidden');
    document.getElementById('connectedGoogleSection').classList.add('hidden');
}

window.handleAuthClick = handleAuthClick;
window.handleSignoutClick = handleSignoutClick;
window.forceLogout = forceLogout;
window.syncCalendar = syncCalendar;
window.showBookingDetail = showBookingDetail;
