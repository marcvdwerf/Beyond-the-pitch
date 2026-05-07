import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function toCents(value) {
  return Math.round(Number(String(value).replace(',', '.')) * 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    packageName,
    description,
    pricePerPerson,
    guests,
    partner,
    date,
    name,
    email
  } = req.body;

  const guestCount = parseInt(guests, 10) || 1;
  const unitAmount = toCents(pricePerPerson);

  if (!packageName || !unitAmount || !guestCount || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const productDescription = [partner, description, date].filter(Boolean).join(' · ');

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      payment_method_types: ['card', 'ideal'],
      locale: 'en',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking?cancelled=true`,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: packageName,
              description: productDescription,
              images: ['https://travelbeyondthepitch.com/images/beyond-the-pitch-grey.png'],
            },
            unit_amount: unitAmount,
          },
          quantity: guestCount,
        },
      ],
      metadata: {
        customer_name: name,
        customer_email: email,
        partner: partner || '',
        package_name: packageName,
        package_description: description || '',
        guests: String(guestCount),
        match_date: date || '',
        full_price_per_person: String(Number(String(pricePerPerson).replace(',', '.'))),
        source: 'beyond-the-pitch-booking',
      },
      payment_intent_data: {
        description: `Beyond the Pitch — ${packageName} — ${name}`,
        metadata: {
          customer_name: name,
          partner: partner || '',
          package_name: packageName,
          package_description: description || '',
          match_date: date || '',
        },
      },
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id
    });

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to create payment session. Please try again.'
    });
  }
}
