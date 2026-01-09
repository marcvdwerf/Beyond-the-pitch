// ===============================
// CONFIGURATION
// ===============================
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
    // Render experiences alvast (statisch)
    renderExperiences();
});

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: [CONFIG.DISCOVERY_DOC],
    });
    gapiInited = true;
    checkAuthStatus();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: '', // Wordt dynamisch gezet in handleAuthClick
    });
    gisInited = true;
    checkAuthStatus();
}

function checkAuthStatus() {
    if (gapiInited && gisInited) {
        const btn = document.getElementById('connectGoogleBtn');
        if (btn) {
            btn.disabled = false;
            document.getElementById('connectBtnText').textContent = 'Connect Google Calendar';
        }
        
        // Check of we al een token in de sessie hebben
        const storedToken = sessionStorage.getItem('gcal_token');
        if (storedToken) {
            gapi.client.setToken(JSON.parse(storedToken));
            updateUIForSignedIn();
            syncCalendar();
        }
    }
}

// ===============================
// AUTHENTICATION FLOW
// ===============================
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        
        // Belangrijk: Token opslaan in GAPI client
        sessionStorage.setItem('gcal_token', JSON.stringify(resp));
        updateUIForSignedIn();
        await loadCalendarList();
        await syncCalendar();
    };

    // Vraag om toestemming als we geen token hebben
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
            sessionStorage.removeItem('gcal_token');
            updateUIForSignedOut();
        });
    }
}

// ===============================
// CALENDAR LOGIC (Verbeterde parsing)
// ===============================
async function syncCalendar() {
    try {
        showStatus('info', 'Ophalen van boekingen...');
        const now = new Date();
        const response = await gapi.client.calendar.events.list({
            calendarId: currentCalendarId,
            // We kijken 1 maand terug en 6 maanden vooruit
            timeMin: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.result.items || [];
        // Filter op BTP- prefix in titel
        bookingsData = events
            .filter(e => e.summary && e.summary.toUpperCase().includes('BTP-'))
            .map(e => parseBookingEvent(e));

        updateStats();
        renderBookingsTable();
        updateLastSyncTime();
        showStatus('success', `${bookingsData.length} boekingen geladen.`);
    } catch (e) {
        console.error("Sync Error:", e);
        if (e.status === 401) {
            handleSignoutClick(); // Token verlopen
            showStatus('error', 'Sessie verlopen. Log opnieuw in.');
        } else {
            showStatus('error', 'Synchronisatie mislukt.');
        }
    }
}

function parseBookingEvent(event) {
    const desc = event.description || '';
    
    // Helper om data uit description te trekken (bijv. "Guests: 4")
    const extractField = (key) => {
        const regex = new RegExp(`${key}:\\s*(.*)`, 'i');
        const match = desc.match(regex);
        return match ? match[1].trim() : null;
    };

    return {
        id: (event.summary.match(/BTP-\d+/) || [event.id])[0],
        experienceName: event.summary.replace(/BTP-\d+\s*-?\s*/, '').trim(),
        customer: extractField('Customer') || extractField('Name') || 'Onbekend',
        email: extractField('Email') || 'Niet opgegeven',
        phone: extractField('Phone') || '-',
        date: event.start.dateTime || event.start.date,
        guests: parseInt(extractField('Guests')) || 1,
        status: (extractField('Status') || 'confirmed').toLowerCase(),
        amount: parseFloat((extractField('Amount') || '0').replace(/[^\d.]/g, '')) || 0,
        description: desc,
        location: event.location || 'Nog te bepalen'
    };
}
