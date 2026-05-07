import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { packageName, pricePerPerson, guests, fixture, date, name, email } = req.body;

  if (!packageName || !pricePerPerson || !guests || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

 const depositTotal = pricePerPerson * parseInt(guests, 10);
  const fullPriceTotal = pricePerPerson * parseInt(guests, 10);
  const remainingTotal = fullPriceTotal - depositTotal;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'], // iDEAL voor Nederlandse klanten
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${packageName}`,
              description: fixture
                ? `${guests} guest${guests > 1 ? 's' : ''} · ${fixture} · ${date}`
                : `${guests} guest${guests > 1 ? 's' : ''} · ${date}`,
              images: ['https://travelbeyondthepitch.com/images/beyond-the-pitch-grey.png'],
            },
            unit_amount: depositTotal * 100, // Stripe werkt in centen
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        customer_name: name,
        package: packageName,
        guests: String(guests),
        fixture: fixture || 'TBC',
        match_date: date || 'TBC',
        deposit_per_person: String(depositPerPerson),
        full_price_per_person: String(pricePerPerson),
        remaining_amount: String(remainingTotal),
        source: 'beyond-the-pitch-booking',
      },
      payment_intent_data: {
       description: `Beyond the Pitch — ${packageName} — ${name}`,
        metadata: {
          customer_name: name,
          package: packageName,
          fixture: fixture || 'TBC',
          remaining_to_collect: String(remainingTotal),
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking?cancelled=true`,
      locale: 'en',
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: 'Failed to create payment session. Please try again.' });
  }
}
