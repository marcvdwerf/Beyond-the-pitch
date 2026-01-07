// Mock Database - In productie zou dit een echte database zijn
const mockDatabase = {
    partners: [
        {
            id: 1,
            email: 'peru@partner.com',
            password: 'peru123',
            companyName: 'Lima Football Tours',
            country: 'Peru',
            type: 'Tour operator',
            status: 'active',
            contactName: 'Carlos Rodriguez',
            phone: '+51 987 654 321',
            languages: ['Spanish', 'English'],
            experiences: [
                {
                    id: 1,
                    title: 'Alianza Lima Matchday Experience',
                    type: 'Matchday experiences',
                    price: 89,
                    capacity: { min: 2, max: 15 },
                    rating: 4.8,
                    bookings: 24
                },
                {
                    id: 2,
                    title: 'Universitario Stadium Tour & Training',
                    type: 'Training sessions / workshops',
                    price: 65,
                    capacity: { min: 4, max: 20 },
                    rating: 4.6,
                    bookings: 18
                }
            ],
            bookings: [
                {
                    id: 'BK-001',
                    experienceName: 'Alianza Lima Matchday',
                    customer: 'John Smith',
                    date: '2026-02-15',
                    guests: 4,
                    status: 'confirmed',
                    amount: 356
                },
                {
                    id: 'BK-002',
                    experienceName: 'Stadium Tour',
                    customer: 'Emma Wilson',
                    date: '2026-02-20',
                    guests: 2,
                    status: 'pending',
                    amount: 130
                }
            ],
            messages: [
                {
                    id: 1,
                    from: 'Beyond the Pitch Team',
                    subject: 'Welcome to our platform!',
                    date: '2026-01-05',
                    read: true
                }
            ]
        },
        {
            id: 2,
            email: 'ireland@partner.com',
            password: 'ireland123',
            companyName: 'Gaelic Experience Ireland',
            country: 'Ireland',
            type: 'Sports club / academy',
            status: 'active',
            contactName: 'Seán O\'Connor',
            phone: '+353 87 123 4567',
            languages: ['English', 'Irish'],
            experiences: [
                {
                    id: 3,
                    title: 'GAA Matchday at Croke Park',
                    type: 'Matchday experiences',
                    price: 120,
                    capacity: { min: 2, max: 12 },
                    rating: 4.9,
                    bookings: 32
                },
                {
                    id: 4,
                    title: 'Gaelic Football Training Session',
                    type: 'Training sessions / workshops',
                    price: 75,
                    capacity: { min: 6, max: 20 },
                    rating: 4.7,
                    bookings: 15
                }
            ],
            bookings: [
                {
                    id: 'BK-003',
                    experienceName: 'GAA Matchday',
                    customer: 'Michael Brown',
                    date: '2026-02-18',
                    guests: 6,
                    status: 'confirmed',
                    amount: 720
                }
            ],
            messages: [
                {
                    id: 2,
                    from: 'Beyond the Pitch Team',
                    subject: 'New booking received',
                    date: '2026-01-06',
                    read: false
                }
            ]
        },
        {
            id: 3,
            email: 'mongolia@partner.com',
            password: 'mongolia123',
            companyName: 'Naadam Adventures',
            country: 'Mongolia',
            type: 'Cultural organization',
            status: 'active',
            contactName: 'Batmunkh Erdene',
            phone: '+976 99 123 456',
            languages: ['Mongolian', 'English'],
            experiences: [
                {
                    id: 5,
                    title: 'Naadam Festival Wrestling Experience',
                    type: 'Cultural activities',
                    price: 250,
                    capacity: { min: 2, max: 8 },
                    rating: 5.0,
                    bookings: 12
                },
                {
                    id: 6,
                    title: 'Horseback Riding with Nomads',
                    type: 'Outdoor / adventure activities',
                    price: 180,
                    capacity: { min: 2, max: 10 },
                    rating: 4.9,
                    bookings: 20
                }
            ],
            bookings: [
                {
                    id: 'BK-004',
                    experienceName: 'Naadam Festival',
                    customer: 'Sarah Johnson',
                    date: '2026-07-11',
                    guests: 2,
                    status: 'confirmed',
                    amount: 500
                },
                {
                    id: 'BK-005',
                    experienceName: 'Horseback Riding',
                    customer: 'David Lee',
                    date: '2026-03-10',
                    guests: 4,
                    status: 'pending',
                    amount: 720
                }
            ],
            messages: []
        }
    ],
    admins: [
        {
            email: 'admin@travelbeyondthepitch.com',
            password: 'admin123',
            name: 'Admin Team'
        }
    ]
};

// Tab switching
function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('partnerLogin').style.display = tab === 'partner' ? 'block' : 'none';
    document.getElementById('adminLogin').style.display = tab === 'admin' ? 'block' : 'none';
}

// Partner Login
function loginPartner(event) {
    event.preventDefault();
    
    const email = document.getElementById('partnerEmail').value;
    const password = document.getElementById('partnerPassword').value;

    const partner = mockDatabase.partners.find(p => p.email === email && p.password === password);

    if (partner) {
        // Store session
        sessionStorage.setItem('userType', 'partner');
        sessionStorage.setItem('userId', partner.id);
        sessionStorage.setItem('userData', JSON.stringify(partner));
        
        // Redirect to partner dashboard
        window.location.href = 'partner-dashboard.html';
    } else {
        alert('Ongeldige inloggegevens. Probeer de demo credentials.');
    }
}

// Admin Login
function loginAdmin(event) {
    event.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    const admin = mockDatabase.admins.find(a => a.email === email && a.password === password);

    if (admin) {
        // Store session
        sessionStorage.setItem('userType', 'admin');
        sessionStorage.setItem('userData', JSON.stringify(admin));
        
        // Redirect to admin dashboard
        window.location.href = 'admin-dashboard.html';
    } else {
        alert('Ongeldige admin inloggegevens.');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mockDatabase };
}
