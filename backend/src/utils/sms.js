const AfricasTalking = require('africastalking');

let _sms = null;

function getSMS() {
  if (!_sms) {
    const at = AfricasTalking({
      apiKey:   process.env.AT_API_KEY,
      username: process.env.AT_USERNAME || 'sandbox',
    });
    _sms = at.SMS;
  }
  return _sms;
}

async function sendSMS(to, text) {
  try {
    let phone = String(to).replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (!phone.startsWith('254')) phone = '254' + phone;
    phone = '+' + phone;

    const result = await getSMS().send({
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
