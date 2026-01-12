* Beyond the Pitch - Partner Dashboard Logic (Geoptimaliseerd)

 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';



document.addEventListener('DOMContentLoaded', () => {

    // 1. Check Autorisatie

    if (typeof window.checkAuth === "function") {

        if (!window.checkAuth('partner')) return; 

    }



    const partnerName = localStorage.getItem("userName") || "Partner";

    const welcomeEl = document.getElementById('welcomeText');

    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${partnerName}`;



    // 2. Navigatie Logica

    window.showSection = (sectionId, element) => {

        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

        

        const target = document.getElementById(sectionId);

        if (target) target.classList.add('active');

        if (element) element.classList.add('active');

        

        if(sectionId === 'overview' && window.calendar) {

            setTimeout(() => window.calendar.render(), 100);

        }

    };



    initCalendar();

    loadDataFromSheet();

});



function initCalendar() {

    const calendarEl = document.getElementById('calendar');

    if (!calendarEl) return;

    window.calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: 'dayGridMonth',

        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },

        eventColor: '#38bdf8'

    });

    window.calendar.render();

}



/**

 * Haalt data op en filtert op basis van de ingelogde partner

 */

async function loadDataFromSheet() {

    const syncBtn = document.getElementById('syncBtn');

    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";

    

    const partnerID = localStorage.getItem("partnerID") || "all";

    

    try {

        // Haal data op van de API

        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(partnerID)}`, { redirect: 'follow' });

        const data = await response.json();

        

        // Filter op rijen die een geldige naam hebben (flexibel voor Full Name of Full name)

        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];



        console.log("Data ontvangen:", bookings); // Voor debugging in de browser console



        renderTable(bookings);

        updateStats(bookings);

        populateCalendar(bookings);



        const syncTimeEl = document.getElementById('lastSyncTime');

        if (syncTimeEl) {

            syncTimeEl.textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

        }

    } catch (e) { 

        console.error("Fout bij synchroniseren:", e); 

    } finally {

        if (syncBtn) syncBtn.innerHTML = "🔄 Sync Data";

    }

}



function renderTable(bookings) {

    const container = document.getElementById('bookingsTableContainer');

    if (!container) return;



    const formatD = (d) => {

        if (!d || d === "N/A") return "-";

        const dateObj = new Date(d);

        return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    };



    let html = `<table><thead><tr>

        <th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Requests</th><th>Status</th>

    </tr></thead><tbody>`;



    if (bookings.length === 0) {

        html += `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No bookings found. Make sure data is present in the Master Sheet.</td></tr>`;

    } else {

        bookings.forEach(b => {

            // Flexibele kolom-mapping

            const name = b["Full Name"] || b["Full name"] || "-";

            const pkg = b["Choose Your Experience"] || b["Experience"] || "-"; 

            const guests = b["Number of Guests"] || b["Guests"] || "1";

            const date = b["Start Date"] || b["Date"] || "-";

            const email = b["Email Address"] || b["Email"] || "";

            const requests = b["Special Requests"] || b["Requests"] || "-";



            html += `<tr>

                <td data-label="Date"><strong>${formatD(date)}</strong></td>

                <td data-label="Guest"><div>${name}</div><div style="font-size:0.7rem; color:gray;">${email}</div></td>

                <td data-label="Experience" style="max-width:150px; font-size:0.8rem;">${pkg}</td>

                <td data-label="Pax"><strong>${guests}</strong></td>

                <td data-label="Requests" style="font-size:0.75rem; color:#64748b;">${requests}</td>

                <td data-label="Status"><span class="badge-confirmed">Confirmed</span></td>

            </tr>`;

        });

    }



    html += '</tbody></table>';

    container.innerHTML = html;

}



function updateStats(b) {

    const totalBookingsEl = document.getElementById('totalBookings');

    const totalGuestsEl = document.getElementById('totalGuests');

    

    if (totalBookingsEl) totalBookingsEl.textContent = b.length;

    

    let count = 0;

    b.forEach(x => {

        const guests = parseInt(x["Number of Guests"] || x["Guests"]) || 1;

        count += guests;

    });

    

    if (totalGuestsEl) totalGuestsEl.textContent = count;

}



function populateCalendar(b) {

    if (!window.calendar) return;

    window.calendar.removeAllEvents();

    

    const events = b.map(x => {

        const name = x["Full Name"] || x["Full name"] || 'Guest';

        const guests = x["Number of Guests"] || x["Guests"] || 1;

        const date = x["Start Date"] || x["Date"];

        

        return {

            title: `${name} (${guests})`,

            start: date,

            allDay: true

        };

    }).filter(event => event.start); // Alleen events met een datum toevoegen



    window.calendar.addEventSource(events);

}
