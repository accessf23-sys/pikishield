require('dotenv').config();
const mongoose    = require('mongoose');
const User        = require('../models/User');
const Policy      = require('../models/Policy');
const Claim       = require('../models/Claim');
const Transaction = require('../models/Transaction');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pikishield');
  console.log('✅ Connected to MongoDB');

  // ── Wipe existing data ──────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Policy.deleteMany({}),
    Claim.deleteMany({}),
    Transaction.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // ── Admin ───────────────────────────────────────────────────────────────────
  const admin = await User.create({
    fullName: 'PikiShield Admin',
    phone:    '254700000001',
    email:    'admin@pikishield.co.ke',
    password: 'Admin@1234',
    role:     'superadmin',
    kycStatus:'approved',
  });
  console.log(`👑 Super Admin: phone=254700000001  password=Admin@1234`);

  // ── Agent ───────────────────────────────────────────────────────────────────
  const agent = await User.create({
    fullName: 'John Kamau (Agent)',
    phone:    '254700000002',
    password: 'Agent@1234',
    role:     'agent',
    kycStatus:'approved',
    region:   'Nairobi',
    mustChangePassword: false,
  });
  console.log(`🤝 Agent: phone=254700000002  password=Agent@1234  code=${agent.agentCode}`);

  // ── Rider 1 ─────────────────────────────────────────────────────────────────
  const rider1 = await User.create({
    fullName:   'James Otieno',
    phone:      '254712345678',
    nationalId: '12345678',
    password:   'Rider@1234',
    role:       'rider',
    kycStatus:  'approved',
    riskTier:   'green',
    riskScore:  20,
    shieldTokens: 45,
    registeredBy: agent._id,
    profile: {
      county:        'Nairobi',
      licenseNumber: 'DL-2020-123456',
      bikeReg:       'KDJ 123A',
      bikeType:      'Petrol',
    },
  });
  console.log(`🏍️  Rider 1: phone=254712345678  password=Rider@1234  memberNo=${rider1.memberNumber}`);

  // ── Rider 1 policies ────────────────────────────────────────────────────────
  const startDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago (past waiting period)
  const p1 = await Policy.create({
    userId: rider1._id, type: 'bail_income',
    startDate, totalContributed: 4000,
  });
  await Policy.create({
    userId: rider1._id, type: 'funeral',
    startDate,
    members: [
      { name: 'Grace Otieno', relation: 'Spouse', age: 35 },
      { name: 'Patrick Otieno', relation: 'Father', age: 62 },
    ],
  });

  // ── Rider 1 approved claim ───────────────────────────────────────────────────
  await Claim.create({
    userId: rider1._id, policyId: p1._id,
    type: 'bail', status: 'approved',
    referenceNumber: 'CLM-2026-00001',
    amountRequested: 15000, amountApproved: 15000,
    description: 'Arrested at roadblock — need bail',
    fraudScore: 12,
    processedBy: admin._id, processedAt: new Date(),
  });

  // ── Rider 1 transactions ────────────────────────────────────────────────────
  await Transaction.create({ userId: rider1._id, type: 'contribution', amount: 4000, description: 'M-Pesa contribution' });
  await Transaction.create({ userId: rider1._id, type: 'token_earned', amount: 22, description: 'Registration bonus' });
  await Transaction.create({ userId: rider1._id, type: 'token_earned', amount: 5, description: 'Safety quiz completed' });

  // ── Rider 2 (pending KYC) ───────────────────────────────────────────────────
  const rider2 = await User.create({
    fullName:   'Faith Wanjiku',
    phone:      '254722987654',
    nationalId: '87654321',
    password:   'Rider@1234',
    role:       'rider',
    kycStatus:  'pending',
    shieldTokens: 22,
    registeredBy: agent._id,
    profile: { county: 'Mombasa', bikeReg: 'MSA 456B', licenseNumber: 'DL-2021-654321' },
  });
  console.log(`🏍️  Rider 2 (pending KYC): phone=254722987654  password=Rider@1234  memberNo=${rider2.memberNumber}`);

  // ── Funeral member ──────────────────────────────────────────────────────────
  const member = await User.create({
    fullName:   'Grace Otieno',
    phone:      '254733111222',
    nationalId: '11223344',
    password:   'Piki1234!',
    role:       'member',
    kycStatus:  'approved',
    mustChangePassword: false,
    nokFor:     rider1._id,
    registeredBy: agent._id,
  });
  console.log(`👥 Member: phone=254733111222  password=Piki1234!  memberNo=${member.memberNumber}`);

  // ── NOK ─────────────────────────────────────────────────────────────────────
  const nok = await User.create({
    fullName: 'Patrick Otieno (NOK)',
    phone:    '254744333444',
    password: 'Nok@1234',
    role:     'nok',
    kycStatus:'approved',
    nokFor:   rider1._id,
  });
  console.log(`🔗 NOK: nokNumber=${nok.nokNumber}  password=Nok@1234`);

  // ── Pending claim (rider2 used pending — simulate another) ───────────────────
  await Claim.create({
    userId: rider1._id, policyId: p1._id,
    type: 'income', status: 'pending',
    referenceNumber: 'CLM-2026-00002',
    amountRequested: 15000,
    description: 'Was hospitalised after accident — claiming income stipend',
    fraudScore: 30,
  });

  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  SuperAdmin: 254700000001 / Admin@1234');
  console.log('  Agent:   254700000002 / Agent@1234');
  console.log('  Rider:   254712345678 / Rider@1234');
  console.log('  Rider2:  254722987654 / Rider@1234  (KYC pending)');
  console.log('  Member:  254733111222 / Piki1234!');
  console.log(`  NOK:     ${nok.nokNumber} / Nok@1234`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });
