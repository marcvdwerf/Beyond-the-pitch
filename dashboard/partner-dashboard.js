/**
 * Beyond the Pitch - Partner Logic v2.9
 */

const CONFIG = {
    CLIENT_ID: '440103208396-uou0t99knmu2a7dd4ieadvmtlcu47k3g.apps.googleusercontent.com',
    API_KEY: 'AIzaSyA2rnwUC3x2OZzwqULdgvkkcyEK1uKqI34', 
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar.readonly'
};

let tokenClient;
let bookingsData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadPartnerInfo();
    renderExperiences(); // Toon de experiences direct bij laden!
    initGoogle();
});

function initGoogle() {
    gapi.load('client', async () => {
        await gapi.client.init({ apiKey: CONFIG.API_KEY, discoveryDocs: [CONFIG.DISCOVERY_DOC] });
        if (gapi.client.getToken()) {
            updateUIForSignedIn();
            syncCalendar();
        }
    });

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: (resp) => {
            if (resp.error) return;
            updateUIForSignedIn();
            syncCalendar();
        },
    });
    document.getElementById('connectGoogleBtn').disabled = false;
}

async function syncCalendar() {
    try {
        const response = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        bookingsData = (response.result.items || [])
            .filter(e => e.summary && e.summary.toUpperCase().includes('BTP'))
            .map(e => parseEvent(e));

        renderBookings();
        updateStats();
        document.getElementById('lastSyncTime').textContent = new Date().toLocaleTimeString();
    } catch (e) { console.error(e); }
}

function parseEvent(e) {
    const d = e.description || '';
    const f = (k) => { const m = d.match(new RegExp(`${k}:\\s*(.+)`, 'i')); return m ? m[1].trim() : 'N/A'; };
    return {
        id: e.summary.match(/BTP-?\d+/i)?.[0] || 'BTP-???',
        title: e.summary.replace(/BTP-?\d+/i, '').replace(/-/g, '').trim(),
        customer: f('Customer'),
        amount: parseFloat(f('Amount').replace(/[^\d.]/g, '')) || 0,
        date: e.start.dateTime || e.start.date
    };
}

function renderBookings() {
    const container = document.getElementById('bookingsTableContainer');
    if (bookingsData.length === 0) {
        container.innerHTML = "<p>No BTP bookings found.</p>";
        return;
    }
    container.innerHTML = `
        <table>
            <thead><tr><th>ID</th><th>Experience</th><th>Date</th><th>Total</th></tr></thead>
            <tbody>
                ${bookingsData.map(b => `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.title}</td>
                        <td>${new Date(b.date).toLocaleDateString()}</td>
                        <td>€${b.amount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

// DEZE FUNCTIE VERWERKT DE EXPERIENCES
function renderExperiences() {
    const container = document.getElementById('experience-container');
    if (!container) return;

    const experiences = [
        { title: "Full Day Package", price: "€120 - €200", desc: "Hidden Spots & Football Tour" },
        { title: "Two Days, One Night", price: "€150 - €200", desc: "Culture & Coastal Experience" },
        { title: "Three Days, Two Nights", price: "€100 - €200 / day", desc: "The Complete Lima Journey" }
    ];

    container.innerHTML = experiences.map(exp => `
        <div style="background:#fff; border:1px solid #eee; border-radius:12px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; padding:15px; font-weight:bold;">${exp.title}</div>
            <div style="padding:15px;">
                <p><strong>Price:</strong> ${exp.price}</p>
                <p style="color:#666; font-size:0.9rem; margin-top:5px;">${exp.desc}</p>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    document.getElementById('totalBookings').textContent = bookingsData.length;
    const rev = bookingsData.reduce((s, b) => s + b.amount, 0);
    document.getElementById('totalRevenue').textContent = `€${rev}`;
}

function loadPartnerInfo() {
    document.getElementById('partnerName').textContent = localStorage.getItem('userName') || 'Partner';
    document.getElementById('partnerEmail').textContent = localStorage.getItem('userEmail') || '';
    document.getElementById('welcomeText').textContent = `Welcome, ${localStorage.getItem('userName') || 'Partner'}`;
}

function handleAuthClick() { tokenClient.requestAccessToken({ prompt: 'select_account' }); }
function handleSignoutClick() { gapi.client.setToken(''); updateUIForSignedOut(); }
function forceLogout() { localStorage.clear(); window.location.replace('index.html'); }
function updateUIForSignedIn() { document.getElementById('connectGoogleSection').classList.add('hidden'); document.getElementById('connectedGoogleSection').classList.remove('hidden'); }
function updateUIForSignedOut() { document.getElementById('connectGoogleSection').classList.remove('hidden'); document.getElementById('connectedGoogleSection').classList.add('hidden'); }
