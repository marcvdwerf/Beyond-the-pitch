// ===============================
// PARTNER DASHBOARD - ENHANCED VERSION
// Beyond the Pitch - Availability & Booking Management
// ===============================

console.log("🚀 Partner Dashboard Loading...");

// Check if user is authenticated (implement this in auth.js)
// checkAuth("partner");

const userEmail = localStorage.getItem("userEmail") || "partner@example.com";

// ===============================
// GOOGLE CALENDAR CONFIG
// ===============================
const GOOGLE_CONFIG = {
    CLIENT_ID: '440103208396-uou0t99knmu2a7dd4ieadvmtlcu47k3g.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/calendar',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
};

let gapiInited = false;
let gisInited = false;
let tokenClient;
let isGoogleAuthed = false;

// ===============================
// PARTNER DATA STRUCTURE
// ===============================
const partnerData = {
    email: userEmail,
    companyName: "Peru Adventure Co.",
    country: "🇵🇪 Peru",
    location: "Lima, Peru",
    calendarId: "primary",
    availableSlots: [],  // Slots created by partner
    bookings: [],        // Bookings from platform
    experiences: [
        { id: 1, title: "Machu Picchu Hike", type: "Trek", duration: "8 hours", price: 200, rating: 4.8, maxGuests: 12 },
        { id: 2, title: "Cusco City Tour", type: "City", duration: "4 hours", price: 125, rating: 4.5, maxGuests: 20 },
        { id: 3, title: "Sacred Valley", type: "Cultural", duration: "6 hours", price: 150, rating: 4.9, maxGuests: 15 },
        { id: 4, title: "Lima Food Tour", type: "Culinary", duration: "3 hours", price: 90, rating: 4.7, maxGuests: 10 }
    ]
};

// ===============================
// DEMO DATA (for testing without calendar)
// ===============================
const demoAvailableSlots = [
    { id: "AVAIL-001", experienceId: 1, experienceName: "Machu Picchu Hike", date: "2026-02-15", time: "06:00", maxGuests: 12, bookedGuests: 4, status: "available", price: 200 },
    { id: "AVAIL-002", experienceId: 2, experienceName: "Cusco City Tour", date: "2026-02-18", time: "09:00", maxGuests: 20, bookedGuests: 0, status: "available", price: 125 },
    { id: "AVAIL-003", experienceId: 3, experienceName: "Sacred Valley", date: "2026-02-20", time: "08:00", maxGuests: 15, bookedGuests: 15, status: "full", price: 150 }
];

const demoBookings = [
    { id: "BTP-1001", slotId: "AVAIL-001", experienceName: "Machu Picchu Hike", customer: "John Smith", email: "john@example.com", date: "2026-02-15", time: "06:00", guests: 4, status: "confirmed", amount: 800 },
    { id: "BTP-1002", slotId: "AVAIL-002", experienceName: "Cusco City Tour", customer: "Emily Clark", email: "emily@example.com", date: "2026-02-18", time: "09:00", guests: 2, status: "pending", amount: 250 }
];

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    console.log("📊 Loading partner dashboard...");
    loadGoogleAPI();
    loadPartnerData();
    setupEventListeners();
    
    // Auto-refresh every 3 minutes if connected
    setInterval(() => {
        if (isGoogleAuthed) {
            syncCalendar(false);
        }
    }, 180000);
});

// ===============================
// GOOGLE API INITIALIZATION
// ===============================
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
            discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC],
        });
        gapiInited = true;
        console.log('✅ Google API Client initialized');
        maybeEnableButtons();
    } catch (error) {
        console.error('Error initializing Google API:', error);
        showNotification('error', 'Failed to initialize Google API');
    }
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: '',
    });
    gisInited = true;
    console.log('✅ Google Identity Services initialized');
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        const connectBtn = document.getElementById('connectGoogleBtn');
        if (connectBtn) {
            connectBtn.removeAttribute('disabled');
            connectBtn.style.opacity = '1';
        }
        showGoogleStatus('ready', '🔵 Ready to connect Google Calendar');
    }
}

// ===============================
// GOOGLE CALENDAR CONNECTION
// ===============================
function connectGoogleCalendar() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error('Auth error:', resp);
            showNotification('error', 'Failed to connect Google Calendar');
            return;
        }
        
        isGoogleAuthed = true;
        console.log('✅ Google Calendar connected');
        showGoogleStatus('connected', '✅ Google Calendar Connected');
        
        document.getElementById('connectGoogleSection')?.classList.add('hidden');
        document.getElementById('connectedGoogleSection')?.classList.remove('hidden');
        
        showNotification('success', 'Google Calendar connected successfully!');
        await syncCalendar(true);
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function disconnectGoogleCalendar() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
    
    isGoogleAuthed = false;
    document.getElementById('connectGoogleSection')?.classList.remove('hidden');
    document.getElementById('connectedGoogleSection')?.classList.add('hidden');
    
    showNotification('info', 'Google Calendar disconnected');
    
    // Reload with demo data
    partnerData.availableSlots = demoAvailableSlots;
    partnerData.bookings = demoBookings;
    loadAvailability();
    loadBookings();
}

// ===============================
// SYNC CALENDAR
// ===============================
async function syncCalendar(showLoading = true) {
    if (!isGoogleAuthed) {
        showNotification('warning', 'Please connect Google Calendar first');
        return;
    }

    if (showLoading) {
        showGoogleStatus('syncing', '🔄 Syncing with Google Calendar...');
    }

    try {
        const now = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

        const response = await gapi.client.calendar.events.list({
            'calendarId': partnerData.calendarId,
            'timeMin': now.toISOString(),
            'timeMax': threeMonthsLater.toISOString(),
            'maxResults': 100,
            'singleEvents': true,
            'orderBy': 'startTime'
        });

        const events = response.result.items || [];
        
        // Separate available slots and bookings
        partnerData.availableSlots = events
            .filter(e => e.summary && e.summary.includes('[AVAILABLE]'))
            .map(parseAvailableSlot);
            
        partnerData.bookings = events
            .filter(e => e.summary && e.summary.includes('BTP-'))
            .map(parseBooking);

        console.log(`✅ Synced ${partnerData.availableSlots.length} slots and ${partnerData.bookings.length} bookings`);
        
        updateLastSyncTime();
        loadAvailability();
        loadBookings();
        updateStats();
        
        if (showLoading) {
            showGoogleStatus('connected', `✅ Last synced: ${new Date().toLocaleTimeString('nl-NL')}`);
        }
        
    } catch (error) {
        console.error('Error syncing calendar:', error);
        showGoogleStatus('error', '❌ Sync failed. Using demo data.');
        showNotification('error', 'Failed to sync calendar');
        
        // Fallback to demo data
        partnerData.availableSlots = demoAvailableSlots;
        partnerData.bookings = demoBookings;
        loadAvailability();
        loadBookings();
    }
}

// ===============================
// PARSE CALENDAR EVENTS
// ===============================
function parseAvailableSlot(event) {
    const description = event.description || '';
    const lines = description.split('\n').map(l => l.trim());
    
    const getField = (fieldName) => {
        const line = lines.find(l => l.startsWith(fieldName + ':'));
        return line ? line.split(':').slice(1).join(':').trim() : '';
    };

    const slotId = event.summary.match(/AVAIL-\d+/)?.[0] || `AVAIL-${Date.now()}`;
    const experienceName = event.summary.replace(/\[AVAILABLE\]|\[FULL\]/g, '').replace(/AVAIL-\d+/g, '').trim();
    
    const maxGuests = parseInt(getField('Max Guests')) || 0;
    const bookedGuests = parseInt(getField('Booked')) || 0;
    
    return {
        id: slotId,
        experienceId: parseInt(getField('Experience ID')) || 0,
        experienceName: experienceName,
        date: event.start.date || event.start.dateTime.split('T')[0],
        time: event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'}) : '',
        maxGuests: maxGuests,
        bookedGuests: bookedGuests,
        status: bookedGuests >= maxGuests ? 'full' : 'available',
        price: parseFloat(getField('Price')) || 0,
        eventId: event.id
    };
}

function parseBooking(event) {
    const description = event.description || '';
    const lines = description.split('\n').map(l => l.trim());
    
    const getField = (fieldName) => {
        const line = lines.find(l => l.startsWith(fieldName + ':'));
        return line ? line.split(':').slice(1).join(':').trim() : '';
    };

    const bookingId = event.summary.match(/BTP-\d+/)?.[0] || 'BTP-XXXX';
    
    return {
        id: bookingId,
        slotId: getField('Slot ID') || '',
        experienceName: getField('Experience') || event.summary.replace(/BTP-\d+\s*-?\s*/, '').trim(),
        customer: getField('Customer') || 'Unknown',
        email: getField('Email') || '',
        date: event.start.date || event.start.dateTime.split('T')[0],
        time: event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'}) : '',
        guests: parseInt(getField('Guests')) || 1,
        status: getField('Status')?.toLowerCase() || 'pending',
        amount: parseFloat(getField('Amount')?.replace('€', '').replace(',', '')) || 0,
        eventId: event.id
    };
}

// ===============================
// CREATE AVAILABLE SLOT
// ===============================
async function createAvailableSlot(slotData) {
    if (!isGoogleAuthed) {
        showNotification('error', 'Please connect Google Calendar first');
        return false;
    }

    try {
        const experience = partnerData.experiences.find(e => e.id == slotData.experienceId);
        if (!experience) {
            showNotification('error', 'Experience not found');
            return false;
        }

        const slotId = `AVAIL-${Date.now().toString().slice(-6)}`;
        const startDateTime = new Date(`${slotData.date}T${slotData.time}`);
        const endDateTime = new Date(startDateTime);
        
        // Parse duration (e.g., "8 hours" -> 8)
        const durationHours = parseInt(experience.duration) || 2;
        endDateTime.setHours(endDateTime.getHours() + durationHours);

        const event = {
            summary: `[AVAILABLE] ${slotId} - ${experience.title}`,
            description: `Experience ID: ${experience.id}
Experience: ${experience.title}
Type: ${experience.type}
Max Guests: ${slotData.maxGuests}
Booked: 0
Price: €${slotData.price || experience.price}
Status: available

🔵 This slot is available for booking via Beyond the Pitch platform`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'Europe/Amsterdam'
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Europe/Amsterdam'
            },
            colorId: '9' // Blue for available slots
        };

        await gapi.client.calendar.events.insert({
            calendarId: partnerData.calendarId,
            resource: event
        });

        console.log('✅ Available slot created:', slotId);
        showNotification('success', `Availability created for ${experience.title}!`);
        await syncCalendar(true);
        return true;
        
    } catch (error) {
        console.error('Error creating slot:', error);
        showNotification('error', 'Failed to create availability slot');
        return false;
    }
}

// ===============================
// UPDATE BOOKING STATUS
// ===============================
async function updateBookingStatus(bookingId, newStatus) {
    if (!isGoogleAuthed) {
        showNotification('error', 'Please connect Google Calendar first');
        return;
    }

    const booking = partnerData.bookings.find(b => b.id === bookingId);
    if (!booking || !booking.eventId) {
        showNotification('error', 'Booking not found');
        return;
    }

    try {
        const eventResponse = await gapi.client.calendar.events.get({
            calendarId: partnerData.calendarId,
            eventId: booking.eventId
        });

        const event = eventResponse.result;
        let description = event.description || '';
        
        // Update status in description
        description = description.replace(/Status:.*$/m, `Status: ${newStatus}`);
        if (!description.includes('Status:')) {
            description += `\nStatus: ${newStatus}`;
        }

        // Update event
        await gapi.client.calendar.events.update({
            calendarId: partnerData.calendarId,
            eventId: booking.eventId,
            resource: {
                ...event,
                description: description,
                colorId: newStatus === 'confirmed' ? '10' : newStatus === 'cancelled' ? '11' : '8'
            }
        });

        console.log(`✅ Updated booking ${bookingId} to ${newStatus}`);
        showNotification('success', `Booking ${newStatus}!`);
        await syncCalendar(true);
        
    } catch (error) {
        console.error('Error updating booking:', error);
        showNotification('error', 'Failed to update booking');
    }
}

// ===============================
// DELETE AVAILABLE SLOT
// ===============================
async function deleteAvailableSlot(slotId) {
    if (!isGoogleAuthed) {
        showNotification('error', 'Please connect Google Calendar first');
        return;
    }

    if (!confirm('Are you sure you want to delete this availability slot?')) {
        return;
    }

    const slot = partnerData.availableSlots.find(s => s.id === slotId);
    if (!slot || !slot.eventId) {
        showNotification('error', 'Slot not found');
        return;
    }

    if (slot.bookedGuests > 0) {
        showNotification('error', 'Cannot delete slot with existing bookings');
        return;
    }

    try {
        await gapi.client.calendar.events.delete({
            calendarId: partnerData.calendarId,
            eventId: slot.eventId
        });

        console.log(`✅ Deleted slot ${slotId}`);
        showNotification('success', 'Availability slot deleted');
        await syncCalendar(true);
        
    } catch (error) {
        console.error('Error deleting slot:', error);
        showNotification('error', 'Failed to delete slot');
    }
}

// ===============================
// LOAD DATA & UI
// ===============================
function loadPartnerData() {
    document.getElementById("partnerName").textContent = partnerData.companyName;
    document.getElementById("partnerCountry").textContent = partnerData.country;
    document.getElementById("welcomeText").textContent = `Welcome, ${partnerData.companyName}!`;

    // Use demo data initially
    partnerData.availableSlots = demoAvailableSlots;
    partnerData.bookings = demoBookings;
    
    updateStats();
    loadAvailability();
    loadBookings();
    loadExperiences();
    
    console.log("✅ Partner data loaded!");
}

function updateStats() {
    const totalBookings = partnerData.bookings.length;
    const confirmedBookings = partnerData.bookings.filter(b => b.status === 'confirmed').length;
    const availableSlots = partnerData.availableSlots.filter(s => s.status === 'available').length;
    const totalRevenue = partnerData.bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.amount, 0);

    document.getElementById("totalBookings").textContent = totalBookings;
    document.getElementById("confirmedBookings").textContent = confirmedBookings;
    document.getElementById("availableSlots").textContent = availableSlots;
    document.getElementById("totalRevenue").textContent = `€${totalRevenue}`;
}

function loadAvailability() {
    const container = document.getElementById("availabilityContainer");
    if (!container) return;
    
    if (partnerData.availableSlots.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#888;">
                <div style="font-size:3rem; margin-bottom:15px;">📅</div>
                <h3>No availability slots yet</h3>
                <p style="margin-top:10px;">Click "Add Availability" to create your first slot</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = partnerData.availableSlots
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(slot => {
            const availableSpots = slot.maxGuests - slot.bookedGuests;
            const percentBooked = (slot.bookedGuests / slot.maxGuests * 100).toFixed(0);
            const statusColor = slot.status === 'full' ? '#ef4444' : availableSpots <= 3 ? '#f59e0b' : '#10b981';
            
            return `
                <div style="border:2px solid #e0e0e0; border-radius:12px; padding:20px; background:white;">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px;">
                        <div>
                            <h3 style="color:#333; margin-bottom:8px;">${slot.experienceName}</h3>
                            <div style="display:flex; gap:20px; font-size:0.9rem; color:#666;">
                                <span>📅 ${new Date(slot.date).toLocaleDateString('nl-NL')}</span>
                                <span>🕐 ${slot.time}</span>
                                <span style="color:${statusColor}; font-weight:600;">
                                    ${slot.status === 'full' ? '🔴 FULL' : `🟢 ${availableSpots} spots left`}
                                </span>
                            </div>
                        </div>
                        <span style="background:#667eea; color:white; padding:6px 12px; border-radius:6px; font-weight:600; font-size:0.9rem;">
                            €${slot.price}
                        </span>
                    </div>
                    
                    <div style="background:#f8f9fa; border-radius:8px; padding:12px; margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.85rem;">
                            <span style="color:#666;">Capacity</span>
                            <span style="color:#333; font-weight:600;">${slot.bookedGuests} / ${slot.maxGuests} guests</span>
                        </div>
                        <div style="background:#e0e0e0; height:8px; border-radius:4px; overflow:hidden;">
                            <div style="background:${statusColor}; height:100%; width:${percentBooked}%; transition:width 0.3s;"></div>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:10px;">
                        <button onclick="viewSlotDetails('${slot.id}')" style="flex:1; padding:8px; background:#667eea; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem;">
                            📊 View Details
                        </button>
                        ${slot.bookedGuests === 0 ? `
                        <button onclick="deleteAvailableSlot('${slot.id}')" style="padding:8px 16px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem;">
                            🗑️
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
}

function loadBookings() {
    const tbody = document.getElementById("allBookings");
    if (!tbody) return;
    
    if (partnerData.bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:40px; color:#888;">
                    <div style="font-size:2rem; margin-bottom:10px;">📭</div>
                    <p>No bookings yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = partnerData.bookings
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(b => `
            <tr>
                <td><strong>${b.id}</strong></td>
                <td>${b.experienceName}</td>
                <td>
                    <div>${b.customer}</div>
                    <div style="font-size:0.8rem; color:#888;">${b.email || ''}</div>
                </td>
                <td>
                    <div>${new Date(b.date).toLocaleDateString("nl-NL")}</div>
                    <div style="font-size:0.8rem; color:#888;">${b.time}</div>
                </td>
                <td>${b.guests}</td>
                <td>
                    <span class="badge badge-${b.status}">
                        ${b.status === "confirmed" ? "✅ Confirmed" : b.status === "cancelled" ? "❌ Cancelled" : "⏳ Pending"}
                    </span>
                </td>
                <td><strong>€${b.amount}</strong></td>
                <td>
                    ${b.status === 'pending' ? `
                        <button onclick="updateBookingStatus('${b.id}', 'confirmed')" 
                                style="padding:6px 12px; background:#10b981; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.85rem; margin-right:5px;">
                            ✅ Confirm
                        </button>
                        <button onclick="updateBookingStatus('${b.id}', 'cancelled')" 
                                style="padding:6px 12px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.85rem;">
                            ❌ Cancel
                        </button>
                    ` : b.status === 'confirmed' ? `
                        <button onclick="updateBookingStatus('${b.id}', 'cancelled')" 
                                style="padding:6px 12px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.85rem;">
                            ❌ Cancel
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join("");
}

function loadExperiences() {
    const grid = document.getElementById("experiencesGrid");
    if (!grid) return;
    
    grid.innerHTML = partnerData.experiences.map(exp => `
        <div style="border:2px solid #e0e0e0; border-radius:15px; padding:20px; margin-bottom:15px; background:white;">
            <h3 style="color:#333; margin-bottom:10px;">${exp.title}</h3>
            <div style="display:flex; gap:15px; margin:10px 0; font-size:0.9rem; color:#666;">
                <span>📍 ${exp.type}</span>
                <span>⏱️ ${exp.duration}</span>
                <span>👥 Max ${exp.maxGuests}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                <div>
                    <span style="font-size:1.5rem; font-weight:700; color:#667eea;">€${exp.price}</span>
                    <span style="color:#888; font-size:0.9rem;"> per person</span>
                </div>
                <span style="color:#f59e0b; font-size:1.1rem;">⭐ ${exp.rating}</span>
            </div>
        </div>
    `).join("");
}

// ===============================
// UI HELPERS
// ===============================
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(sectionId)?.classList.add('active');
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

function showGoogleStatus(type, message) {
    const statusEl = document.getElementById('googleStatus');
    if (!statusEl) return;

    const styles = {
        ready: { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' },
        connected: { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
        syncing: { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' },
        error: { bg: '#fee2e2', color: '#991b1b', border: '#ef4444' }
    };

    const style = styles[type] || styles.ready;

    statusEl.innerHTML = `
        <div style="padding:15px; border-radius:10px; background:${style.bg}; color:${style.color}; border:2px solid ${style.border}; margin-bottom:20px; font-weight:600;">
            ${message}
        </div>
    `;
}

function showNotification(type, message) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updateLastSyncTime() {
    const timeEl = document.getElementById('lastSyncTime');
    if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString('nl-NL');
    }
}

// ===============================
// MODAL FOR ADDING AVAILABILITY
// ===============================
function showAddAvailabilityModal() {
    const modal = document.createElement('div');
    modal.id = 'availabilityModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const experienceOptions = partnerData.experiences
        .map(exp => `<option value="${exp.id}">${exp.title} (€${exp.price})</option>`)
        .join('');

    modal.innerHTML = `
        <div style="background:white; border-radius:15px; padding:30px; max-width:500px; width:90%; max-height:90vh; overflow-y:auto;">
            <h2 style="margin-bottom:20px; color:#333;">📅 Add Availability Slot</h2>
            
            <form id="availabilityForm" onsubmit="handleAddAvailability(event)">
                <div style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px; color:#666; font-weight:600;">Experience</label>
                    <select name="experienceId" required style="width:100%; padding:12px; border:2px solid #e0e0e0; border-radius:8px; font-size:1rem;">
                        <option value="">Select experience...</option>
                        ${experienceOptions}
                    </select>
                </div>

                <div style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px; color:#666; font-weight:600;">Date</label>
                    <input type="date" name="date" required min="${new Date().toISOString().split('T')[0]}" 
                           style="width:100%; padding:12px; border:2px solid #e0e0e0; border-radius:8px; font-size:1rem;">
                </div>

                <div style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px; color:#666; font-weight:600;">Time</label>
                    <input type="time" name="time" required 
                           style="width:100%; padding:12px; border:2px solid #e0e0e0; border-radius:8px; font-size:1rem;">
                </div>

                <div style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px; color:#666; font-weight:600;">Max Guests</label>
                    <input type="number" name="maxGuests" required min="1" max="50" 
                           style="width:100%; padding:12px; border:2px solid #e0e0e0; border-radius:8px; font-size:1rem;">
                </div>

                <div style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px; color:#666; font-weight:600;">Price per Person (€)</label>
                    <input type="number" name="price" required min="0" step="0.01" 
                           style="width:100%; padding:12px; border:2px solid #e0e0e0; border-radius:8px; font-size:1rem;">
                </div>

                <div style="display:flex; gap:10px; margin-top:25px;">
                    <button type="button" onclick="closeModal()" 
                            style="flex:1; padding:12px; background:#e0e0e0; color:#333; border:none; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer;">
                        Cancel
                    </button>
                    <button type="submit" 
                            style="flex:1; padding:12px; background:#667eea; color:white; border:none; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer;">
                        Create Slot
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Set default price when experience is selected
    modal.querySelector('select[name="experienceId"]').addEventListener('change', function(e) {
        const expId = parseInt(e.target.value);
        const exp = partnerData.experiences.find(ex => ex.id === expId);
        if (exp) {
            modal.querySelector('input[name="price"]').value = exp.price;
            modal.querySelector('input[name="maxGuests"]').value = exp.maxGuests;
        }
    });
}

async function handleAddAvailability(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const slotData = {
        experienceId: parseInt(formData.get('experienceId')),
        date: formData.get('date'),
        time: formData.get('time'),
        maxGuests: parseInt(formData.get('maxGuests')),
        price: parseFloat(formData.get('price'))
    };

    const success = await createAvailableSlot(slotData);
    if (success) {
        closeModal();
    }
}

function closeModal() {
    const modal = document.getElementById('availabilityModal');
    if (modal) {
        modal.remove();
    }
}

function viewSlotDetails(slotId) {
    const slot = partnerData.availableSlots.find(s => s.id === slotId);
    if (!slot) return;
    
    const relatedBookings = partnerData.bookings.filter(b => b.slotId === slotId);
    
    const modal = document.createElement('div');
    modal.id = 'slotDetailsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    modal.innerHTML = `
        <div style="background:white; border-radius:15px; padding:30px; max-width:600px; width:90%; max-height:90vh; overflow-y:auto;">
            <h2 style="margin-bottom:20px; color:#333;">📊 Slot Details</h2>
            
            <div style="background:#f8f9fa; border-radius:10px; padding:20px; margin-bottom:20px;">
                <h3 style="color:#667eea; margin-bottom:15px;">${slot.experienceName}</h3>
                <div style="display:grid; gap:10px; font-size:0.95rem;">
                    <div>📅 <strong>Date:</strong> ${new Date(slot.date).toLocaleDateString('nl-NL')}</div>
                    <div>🕐 <strong>Time:</strong> ${slot.time}</div>
                    <div>💰 <strong>Price:</strong> €${slot.price} per person</div>
                    <div>👥 <strong>Capacity:</strong> ${slot.bookedGuests} / ${slot.maxGuests} guests</div>
                    <div>📊 <strong>Status:</strong> <span style="color:${slot.status === 'full' ? '#ef4444' : '#10b981'}; font-weight:600;">${slot.status.toUpperCase()}</span></div>
                </div>
            </div>

            <h3 style="margin-bottom:15px; color:#333;">🎫 Bookings (${relatedBookings.length})</h3>
            ${relatedBookings.length > 0 ? `
                <div style="max-height:300px; overflow-y:auto;">
                    ${relatedBookings.map(b => `
                        <div style="border:1px solid #e0e0e0; border-radius:8px; padding:15px; margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                <strong>${b.customer}</strong>
                                <span class="badge badge-${b.status}" style="font-size:0.8rem;">${b.status}</span>
                            </div>
                            <div style="font-size:0.9rem; color:#666;">
                                <div>📧 ${b.email}</div>
                                <div>👥 ${b.guests} guests</div>
                                <div>💰 €${b.amount}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <p style="text-align:center; color:#888; padding:20px;">No bookings yet</p>
            `}

            <button onclick="closeModal()" 
                    style="width:100%; padding:12px; background:#667eea; color:white; border:none; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer; margin-top:20px;">
                Close
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

// ===============================
// EVENT LISTENERS
// ===============================
function setupEventListeners() {
    // Auto-fill experience price when selected
    document.addEventListener('change', (e) => {
        if (e.target.name === 'experienceId') {
            const expId = parseInt(e.target.value);
            const exp = partnerData.experiences.find(ex => ex.id === expId);
            if (exp) {
                const priceInput = document.querySelector('input[name="price"]');
                const guestsInput = document.querySelector('input[name="maxGuests"]');
                if (priceInput) priceInput.value = exp.price;
                if (guestsInput) guestsInput.value = exp.maxGuests;
            }
        }
    });

    // Close modal on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// ===============================
// LOGOUT
// ===============================
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        window.location.href = 'index.html';
    }
}

// ===============================
// MAKE FUNCTIONS GLOBAL
// ===============================
window.showSection = showSection;
window.connectGoogleCalendar = connectGoogleCalendar;
window.disconnectGoogleCalendar = disconnectGoogleCalendar;
window.syncCalendar = syncCalendar;
window.refreshBookings = () => syncCalendar(true);
window.updateBookingStatus = updateBookingStatus;
window.showAddAvailabilityModal = showAddAvailabilityModal;
window.handleAddAvailability = handleAddAvailability;
window.deleteAvailableSlot = deleteAvailableSlot;
window.viewSlotDetails = viewSlotDetails;
window.closeModal = closeModal;
window.logout = logout;

console.log("✅ Partner Dashboard Enhanced loaded!");
