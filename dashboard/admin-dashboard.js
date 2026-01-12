/**
 * Beyond the Pitch - Admin Dashboard Logic (Enhanced)
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzBfHwVlLA4B8t-UNBtMGQUxvwhww33SndRKIJRjn83WxtFPiHwU_ZiWsqZYDnytJCNrg/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Forceer Admin Check
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('admin')) return; 
    }

    // Welkomsttekst personaliseren
    const adminName = localStorage.getItem("userName") || "Master Admin";
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome, ${adminName}`;

    initCalendar();
    loadAdminData();
});

/**
 * Initialiseert de FullCalendar
 */
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { 
            left: 'prev,next today', 
            center: 'title', 
            right: 'dayGridMonth,timeGridWeek' 
        },
        eventColor: '#c5a059', // Luxe goudkleur voor admin events
        height: 'auto',
        firstDay: 1 // Maandag als eerste dag
    });
    window.calendar.render();
}

/**
 * Haalt alle data op uit de Master Sheet met de gekozen filter
 */
async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    const tableContainer = document.getElementById('adminTableContainer');
    
    if (syncBtn) {
        syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        syncBtn.disabled = true;
    }

    if (tableContainer) {
        tableContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading latest bookings...</div>';
    }
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // Filter op rijen met een naam
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        renderAdminTable(bookings);
        updateAdminStats(bookings);
        populateAdminCalendar(bookings);

    } catch (e) {
        console.error("Admin Fetch Error:", e);
        if (tableContainer) {
            tableContainer.innerHTML = '<div class="error-msg">❌ Error connecting to Master Sheet. Please try again.</div>';
        }
    } finally {
        if (syncBtn) {
            syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data';
            syncBtn.disabled = false;
        }
    }
}

/**
 * Bouwt de Master Booking tabel op
 */
function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    if (!container) return;

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Partner</th>
                    <th>Date</th>
                    <th>Guest Details</th>
                    <th>Experience</th>
                    <th>Pax</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:40px;">No bookings found for this selection.</td></tr>`;
    } else {
        bookings.forEach(b => {
            const partner = b["Partner"] || b["PartnerID"] || "Lima";
            const name = b["Full Name"] || b["Full name"] || "-";
            const email = b["Email Address"] || "";
            const date = b["Start Date"] || "-";
            const pkg = b["Choose Your Experience"] || "-";
            const pax = b["Number of Guests"] || "1";

            html += `
                <tr>
                    <td><span class="badge-partner">${partner}</span></td>
                    <td><strong>${date}</strong></td>
                    <td>
                        <div class="guest-name">${name}</div>
                        <div class="guest-email">${email}</div>
                    </td>
                    <td class="cell-experience">${pkg}</td>
                    <td><span class="pax-count">${pax}</span></td>
                    <td><span class="badge-status status-confirmed">Confirmed</span></td>
                </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Update de statistieken kaarten bovenin
 */
function updateAdminStats(b) {
    const totalBookings = b.length;
    let totalGuests = 0;
    
    // Unieke partners tellen
    const partners = new Set();
    
    b.forEach(x => {
        totalGuests += parseInt(x["Number of Guests"] || x["Guests"]) || 1;
        partners.add(x["Partner"] || x["PartnerID"] || "Lima");
    });

    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('totalGuests').textContent = totalGuests;
    
    // Als de filter op "all" staat, tonen we het aantal unieke partners
    const activePartnersEl = document.getElementById('activePartners');
    if (activePartnersEl) {
        activePartnersEl.textContent = partners.size;
    }
}

/**
 * Zet de boekingen op de kalender
 */
function populateAdminCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    
    const events = b.map(x => ({
        title: `[${x["Partner"] || 'P'}] ${x["Full Name"] || 'Guest'}`,
        start: x["Start Date"],
        allDay: true,
        extendedProps: {
            experience: x["Choose Your Experience"]
        }
    })).filter(e => e.start);

    window.calendar.addEventSource(events);
}

/**
 * Sectie-wisselaar (Navigatie)
 */
window.showSection = (sectionId, element) => {
    // UI Update
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active');
    if (element) element.classList.add('active');

    // Kalender fix: moet opnieuw gerenderd worden als de sectie zichtbaar wordt
    if (sectionId === 'overview' && window.calendar) {
        setTimeout(() => window.calendar.render(), 150);
    }
};
