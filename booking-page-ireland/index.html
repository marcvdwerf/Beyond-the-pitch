import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            name,
            email,
            phone,
            experience,
            date,
            guests,
            requests,
            fixture,
            depositPerPerson,
            packagePricePerPerson
        } = req.body || {};

        if (!name || !email || !experience || !date || !fixture) {
            return res.status(400).json({ error: 'Missing required booking fields.' });
        }

        const guestCount = Number(guests);
        const deposit = Number(depositPerPerson || 50);
        const packagePrice = Number(packagePricePerPerson || 0);

        if (!guestCount || guestCount < 4) {
            return res.status(400).json({ error: 'Minimum number of guests is 4.' });
        }

        if (!deposit || deposit < 1) {
            return res.status(400).json({ error: 'Invalid deposit amount.' });
        }

        const appUrl = process.env.APP_URL || req.headers.origin;
        const bookingPath = process.env.BOOKING_PATH || '/';
        const successBase = `${appUrl}${bookingPath}`;

        const successParams = new URLSearchParams({
            name,
            email,
            phone: phone || '',
            experience,
            date,
            guests: String(guestCount),
            requests: requests || '',
            fixture
        });

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: email,
            payment_method_types: ['card', 'ideal'],
            billing_address_collection: 'auto',
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `${experience} — Deposit`,
                            description: fixture
                        },
                        unit_amount: deposit * 100
                    },
                    quantity: guestCount
                }
            ],
            metadata: {
                booking_name: name,
                booking_email: email,
                booking_phone: phone || '',
                experience,
                date,
                guests: String(guestCount),
                fixture,
                requests: requests || '',
                deposit_per_person: String(deposit),
                package_price_per_person: String(packagePrice)
            },
            success_url: `${successBase}?session_id={CHECKOUT_SESSION_ID}&${successParams.toString()}`,
            cancel_url: `${successBase}?cancelled=true`,
            locale: 'en',
            allow_promotion_codes: false
        });

        return res.status(200).json({ id: session.id });
    } catch (error) {
        console.error('Stripe checkout creation failed:', error);
        return res.status(500).json({
            error: error.message || 'Unable to create Stripe checkout session.'
        });
    }
}
