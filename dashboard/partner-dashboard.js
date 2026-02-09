/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Versie: 2.1 - Inclusief Netto Prijzen, Thema-switch & Maandagenda
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbw7TZYAZjftT2346xjhs-Ec4BfioYqcRkvtjCkKy0jQW0rJ_C4ifdmX1G-jDZ06UqCbIA/exec';

document.addEventListener('DOMContentLoaded', () => {
    const partnerID = sessionStorage.getItem("partnerID");
    const userName = sessionStorage.getItem("userName");

    if (!partnerID) {
        window.location.href = 'index.html'; // Terug naar login als er geen sessie is
        return;
    }

    // 1. Automatische Thema Kleuren aanpassen
    if (partnerID.toLowerCase() === "ireland") {
        document.body.classList.add("theme-ireland");
    }

    // UI Initialiseren
    document.getElementById("welcomeText").innerText = `Welcome, ${userName || partnerID}`;
    
    // Data laden
    loadDataFromSheet();
    loadPackages(); // Haalt de pakketten met netto prijzen op
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

        // Filter eventuele lege rijen uit de Google Sheet
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

// 3. Pakketten ophalen (Alleen Netto Prijs voor Partners)
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
            <div class="stat-card">
                <img src="${pkg.ImageURL || 'https://via.placeholder.com/300x150'}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;">
                <h3>${pkg.PackageName}</h3>
                <p style="color: #64748b; font-size: 0.8rem; margin-bottom: 15px;">${pkg.Description || 'Experience description'}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; color: var(--primary);">
                        € ${pkg.NetPrice} 
                    </span>
                    <button class="btn btn-outline" style="font-size: 0.7rem;">Details</button>
                </div>
            </div>
        `).join('');
    } catch (error) { 
        console.error("Error loading packages:", error);
        pkgGrid.innerHTML = "Fout bij het laden van pakketten."; 
    }
}

// 4. Agenda Rendering (Maandoverzicht Fix)
function renderCalendar(data) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !data) return;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek'
        },
        firstDay: 1,
        height: 'auto',
        events: data.map(row => ({
            title: `${row["Full Name"] || 'Booking'} - ${row["Experience"] || ''}`,
            start: row["Start Date"] || row["Date"],
            allDay: true,
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-dark').trim(),
            extendedProps: {
                guests: row["Guests"] || row["Number of Guests"] || "0"
            }
        })),
        eventClick: function(info) {
            alert(`Customer: ${info.event.title}\nGuests: ${info.event.extendedProps.guests}`);
        }
    });
    
    calendar.render();
}

// 5. Statistieken en Tabel
function renderStats(data) {
    document.getElementById("totalBookings").innerText = data.length;
    const guests = data.reduce((sum, row) => sum + (parseInt(row["Guests"] || row["Number of Guests"]) || 0), 0);
    document.getElementById("totalGuests").innerText = guests;
}

function renderTable(data) {
    const container = document.getElementById("bookingsTableContainer");
    if (!container) return;
    if (data.length === 0) { container.innerHTML = "No bookings found."; return; }

    const headers = ["Start Date", "Full Name", "Experience", "Guests"];
    let html = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
    
    data.forEach(row => {
        html += `<tr>
            <td>${row["Start Date"] || row["Date"] || '-'}</td>
            <td><strong>${row["Full Name"] || '-'}</strong></td>
            <td>${row["Experience"] || '-'}</td>
            <td>${row["Guests"] || row["Number of Guests"] || '1'}</td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// 6. Navigatie en Export
window.showSection = function(sectionId, el) {
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(sectionId);
    if(target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}

window.logout = function() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}
