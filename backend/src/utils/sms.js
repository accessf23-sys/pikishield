const AfricasTalking = require('africastalking');

const at = AfricasTalking({
  apiKey:   process.env.AT_API_KEY   || '',
  username: process.env.AT_USERNAME  || 'sandbox',
});

const sms = at.SMS;

/**
 * Send an SMS message
 * @param {string} to   - Phone number e.g. +254712345678
 * @param {string} text - Message text
 */
async function sendSMS(to, text) {
  try {
    // Normalize phone number to +254 format
    let phone = String(to).replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (!phone.startsWith('254')) phone = '254' + phone;
    phone = '+' + phone;

    const result = await sms.send({
      to:      [phone],
      message: text,
      from:    'PikiShield',
    });

    console.log('SMS sent:', JSON.stringify(result));
    return { success: true, result };
  } catch (err) {
    console.error('SMS error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendSMS };
