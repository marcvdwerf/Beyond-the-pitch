/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Version: 2.6 (Fixed Sync & Filters)
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
        // Automatisch syncen als we al een token hebben
        if (gapi.client.getToken()) {
            updateUIForSignedIn();
            syncCalendar();
        }
    }
}

// ===============================
// SYNC LOGIC (DEZE IS AANGEPAST)
// ===============================
async function syncCalendar() {
    try {
        showStatus('info', 'Connecting to Google...');
        
        // We halen events op van 3 maanden geleden tot ver in de toekomst
        const now = new Date();
        const response = await gapi.client.calendar.events.list({
            calendarId: currentCalendarId,
            timeMin: new Date(now.setMonth(now.getMonth() - 3)).toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.result.items || [];
        console.log("Total events found in Google:", events.length);

        // FILTER: We zoeken naar "BTP" ergens in de titel (hoofdletterongevoelig)
        bookingsData = events
            .filter(e => {
                const hasTitle = e.summary && e.summary.toUpperCase().includes('BTP');
                if (!hasTitle) console.log("Skipped event (no BTP in title):", e.summary);
                return hasTitle;
            })
            .map(e => parseBookingEvent(e));

        console.log("Filtered BTP bookings:", bookingsData.length);

        updateStats();
        renderBookingsTable();
        updateLastSyncTime();
        
        if (bookingsData.length > 0) {
            showStatus('success', `${bookingsData.length} bookings synchronized.`);
        } else {
            showStatus('warning', 'No bookings found with "BTP" in title.');
        }

    } catch (e) {
        console.error("Sync Error:", e);
        showStatus('error', 'Sync failed. Try to reconnect.');
    }
}

function parseBookingEvent(event) {
    const desc = event.description || '';
    const getF = (key) => {
        const m = desc.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
        return m ? m[1].trim() : '';
    };

    // ID uit de titel halen (bijv. BTP-101)
    const idMatch = event.summary.match(/BTP-?\d+/i);
    const bookingId = idMatch ? idMatch[0].toUpperCase() : 'BTP-???';

    return {
        id: bookingId,
        experienceName: event.summary.replace(/BTP-?\d+\s*-?\s*/i, '').trim() || 'Custom Experience',
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
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#888; border: 2px dashed #ccc; border-radius:10px;">
                <p><strong>No bookings found.</strong></p>
                <p style="font-size:0.9rem;">Make sure your Google Calendar events have "BTP" in the title.</p>
                <p style="font-size:0.8rem; margin-top:10px;">Example: "BTP-101 Football Tour"</p>
            </div>`;
        return;
    }

    const sorted = [...bookingsData].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="text-align:left; border-bottom:2px solid #eee;">
                    <th style="padding:12px;">ID</th>
                    <th>Experience</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(b => `
                    <tr onclick="showBookingDetail('${b.id}')" style="border-bottom:1px solid #eee; cursor:pointer;">
                        <td style="padding:12px;"><strong>${b.id}</strong></td>
                        <td>${b.experienceName}</td>
                        <td>${b.customer}</td>
                        <td>${formatDate(b.date)}</td>
                        <td><span class="badge" style="background:#d1fae5; color:#065f46; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${b.status}</span></td>
                        <td>€${b.amount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
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

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
}

function showStatus(type, msg) {
    const container = document.getElementById('statusContainer');
    if (!container) return;
    const colors = { success: '#d1fae5', error: '#fee2e2', info: '#dbeafe', warning: '#fef3c7' };
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
    document.getElementById('partnerName').textContent = localStorage.getItem('userName') || 'Partner';
}

function updateUIForSignedIn() {
    document.getElementById('connectGoogleSection').classList.add('hidden');
    document.getElementById('connectedGoogleSection').classList.remove('hidden');
}

function updateUIForSignedOut() {
    document.getElementById('connectGoogleSection').classList.remove('hidden');
    document.getElementById('connectedGoogleSection').classList.add('hidden');
}

// Global exposure for HTML
window.handleAuthClick = handleAuthClick;
window.handleSignoutClick = handleSignoutClick;
window.forceLogout = forceLogout;
window.syncCalendar = syncCalendar;
window.showSection = showSection;
