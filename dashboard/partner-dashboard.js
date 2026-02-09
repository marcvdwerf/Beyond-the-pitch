/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Versie: 3.0 - Mobile Optimized, Status Badges & Responsive Tables
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

document.addEventListener('DOMContentLoaded', () => {
    const partnerID = sessionStorage.getItem("partnerID");
    const userName = sessionStorage.getItem("userName");

    if (!partnerID) {
        window.location.href = 'index.html'; 
        return;
    }

    // 1. Thema Kleuren (bijv. Groen voor Ireland)
    if (partnerID.toLowerCase() === "ireland") {
        document.body.classList.add("theme-ireland");
    }

    // UI Initialiseren
    document.getElementById("welcomeText").innerText = `Welcome, ${userName || partnerID}`;
    
    // Data laden
    loadDataFromSheet();
    loadPackages(); 
});

// 2. Boekingen ophalen en statistieken berekenen
async function loadDataFromSheet() {
    const pID = sessionStorage.getItem("partnerID");
    const syncBtn = document.getElementById("syncBtn");
    if(syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(pID)}`);
        const data = await response.json();
        
        if (!data || data.error) throw new Error(data.error || "Geen data");

        // Filter lege rijen en match op koppen uit Master Sheet
        const cleanData = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Experience"]) : [];

        renderStats(cleanData);
        renderTable(cleanData);
        renderCalendar(cleanData);
        
    } catch (error) {
        console.error("Error loading bookings:", error);
    } finally {
        if(syncBtn) syncBtn.innerHTML = '🔄 Sync Data';
    }
}

// 3. Pakketten ophalen (Responsive Grid)
async function loadPackages() {
    const pID = sessionStorage.getItem("partnerID");
    const pkgGrid = document.getElementById("dynamicPackagesGrid");
    if (!pkgGrid) return;
    
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=${encodeURIComponent(pID)}`);
        const packages = await response.json();

        if (!packages || packages.length === 0) {
            pkgGrid.innerHTML = "<p>No packages assigned to your account yet.</p>";
            return;
        }

        pkgGrid.innerHTML = packages.map(pkg => `
            <div class="stat-card package-card">
                <img src="${pkg.ImageURL || 'https://via.placeholder.com/300x150'}" class="pkg-img">
                <h3>${pkg.PackageName}</h3>
                <p class="pkg-desc">${pkg.Description || 'Experience description'}</p>
                <div class="pkg-footer">
                    <span class="pkg-price">€ ${pkg.NetPrice}</span>
                    <span class="badge-net">NETTO</span>
                </div>
            </div>
        `).join('');
    } catch (error) { 
        pkgGrid.innerHTML = "Error loading packages."; 
    }
}

// 4. Verbeterde Tabel (Mobile Ready met data-labels)
function renderTable(data) {
    const container = document.getElementById("bookingsTableContainer");
    if (!container) return;
    if (data.length === 0) { container.innerHTML = "No bookings found."; return; }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Guest</th>
                    <th>Experience</th>
                    <th>Pax</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;
    
    data.forEach(row => {
        const status = row["Status"] || "Pending";
        const statusClass = status.toLowerCase() === 'confirmed' ? 'status-confirmed' : 'status-pending';
        
        // Formatteer datum voor mobiel
        const d = new Date(row["Start Date"] || row["Date"]);
        const fDate = !isNaN(d) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "-";

        html += `
            <tr>
                <td data-label="Date"><strong>${fDate}</strong></td>
                <td data-label="Guest"><strong>${row["Full Name"] || '-'}</strong></td>
                <td data-label="Experience">${row["Experience"] || '-'}</td>
                <td data-label="Pax">${row["Guests"] || '1'}</td>
                <td data-label="Status">
                    <span class="status-badge ${statusClass}">${status}</span>
                </td>
            </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// 5. Maandagenda (Kalender)
function renderCalendar(data) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !data) return;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth', // List op mobiel
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek'
        },
        events: data.map(row => ({
            title: `${row["Full Name"] || 'Booking'}`,
            start: row["Start Date"] || row["Date"],
            allDay: true,
            extendedProps: {
                experience: row["Experience"],
                guests: row["Guests"] || "0"
            }
        })),
        eventClick: function(info) {
            alert(`Customer: ${info.event.title}\nExperience: ${info.event.extendedProps.experience}\nGuests: ${info.event.extendedProps.guests}`);
        }
    });
    
    calendar.render();
}

// 6. Statistieken
function renderStats(data) {
    document.getElementById("totalBookings").innerText = data.length;
    const guests = data.reduce((sum, row) => sum + (parseInt(row["Guests"]) || 0), 0);
    document.getElementById("totalGuests").innerText = guests;
}

// 7. Navigatie
window.showSection = function(sectionId, el) {
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    
    const target = document.getElementById(sectionId);
    if(target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');
}

window.logout = function() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}
