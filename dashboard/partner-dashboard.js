/**
 * Beyond the Pitch - Partner Dashboard Logic (Enhanced Version)
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwRQcpt9Ydu4alij0mrccYTflXrd6f3NvmSDDSbe2aDWrto0BDuV4v1pzuJt2jaKW0fKw/exec';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return;
    }

    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeHeader = document.getElementById('welcomeText');
    if (welcomeHeader) welcomeHeader.textContent = `Welcome back, ${partnerName}`;

    initCalendar();
    loadDataFromSheet();
});

// Initialize the Calendar
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        eventColor: '#38bdf8',
        events: [] // Will be populated by data
    });
    window.calendar.render();
}

async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";

    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        if (!response.ok) throw new Error("Network error");
        
        const data = await response.json();
        const activeBookings = data.filter(row => (row["Full Name"] || row["Full name"]) );

        renderTable(activeBookings);
        updateStats(activeBookings);
        populateCalendar(activeBookings);

        const now = new Date();
        document.getElementById('lastSyncTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    } catch (error) {
        console.error("Fetch error:", error);
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Refresh Data";
    }
}

function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!bookings.length) {
        container.innerHTML = '<p>No bookings found.</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Guest Details</th>
                    <th>Package / Experience</th>
                    <th>Guests</th>
                    <th>Special Requests</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    bookings.forEach(b => {
        const name = b["Full Name"] || b["Full name"] || "N/A";
        const email = b["Email Address"] || "N/A";
        const phone = b["Phone Number"] || "N/A";
        const date = b["Start Date"] || b["Preferred Start Date"] || "N/A";
        const pkg = b["Choose Your Experience"] || "-";
        const guests = b["Number of Guests"] || "1";
        const requests = b["Special Requests"] || "None";

        html += `
            <tr>
                <td><strong>${date}</strong></td>
                <td>
                    <div class="name-cell">${name}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${email} • ${phone}</div>
                </td>
                <td>${pkg}</td>
                <td>${guests}</td>
                <td><div class="request-note" title="${requests}">${requests}</div></td>
                <td><span class="badge badge-confirmed">Confirmed</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function populateCalendar(bookings) {
    const events = bookings.map(b => {
        const dateStr = b["Start Date"] || b["Preferred Start Date"];
        // Ensure date is in a format JS understands (YYYY-MM-DD)
        return {
            title: `${b["Full Name"] || 'Guest'} (${b["Number of Guests"] || 1})`,
            start: dateStr,
            allDay: true,
            extendedProps: {
                experience: b["Choose Your Experience"]
            }
        };
    });
    
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(events);
}

function updateStats(bookings) {
    document.getElementById('totalBookings').textContent = bookings.length;
    let guestCount = 0;
    bookings.forEach(b => {
        const n = parseInt(b["Number of Guests"]);
        guestCount += isNaN(n) ? 1 : n;
    });
    document.getElementById('totalGuests').textContent = guestCount;
}
