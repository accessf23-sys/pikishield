import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Fill these in before launch.
const COMPANY = {
  name: 'PikiShield',
  legalName: 'PikiShield (legal entity name to be inserted)',
  regNo: 'Registration number to be inserted',
  address: 'Registered address to be inserted',
};
const VERSION = '1.0';
const UPDATED = 'November 2026';
// Set to true only after a Kenyan advocate has reviewed this text.
const LEGAL_REVIEWED = false;

const H = ({ id, children }) => (
  <h2 id={id} style={{ fontSize: 18, margin: '28px 0 10px', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>{children}</h2>
);
const P = ({ children }) => <p style={{ margin: '0 0 10px', lineHeight: 1.7, color: 'var(--text-2)', fontSize: 14 }}>{children}</p>;
const UL = ({ items }) => (
  <ul style={{ margin: '0 0 10px 20px', lineHeight: 1.7, color: 'var(--text-2)', fontSize: 14 }}>
    {items.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
  </ul>
);

export default function TermsPage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView();
    } else window.scrollTo(0, 0);
  }, [hash]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '28px 28px 36px' }}>
        <Link to="/login" style={{ fontSize: 13, color: 'var(--emerald-dark)', fontWeight: 600 }}>Back to sign in</Link>
        <h1 style={{ fontSize: 28, margin: '14px 0 4px' }}>Terms and Conditions and Privacy Policy</h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Version {VERSION} - Last updated {UPDATED}</div>

        {!LEGAL_REVIEWED && (
          <div className="alert alert-warning">This document is a draft pending legal review.</div>
        )}

        <H id="acceptance">1. Acceptance, eligibility and your account</H>
        <P>By creating a {COMPANY.name} account or paying a premium you agree to these Terms and to the Privacy Policy in section 5. If you do not agree, do not register.</P>
        <UL items={[
          'You must be 18 or older, hold a valid Kenyan National ID, and own the phone number you register with.',
          'Riders (boda boda operators) may choose Bail, Bail + Income Stipend or Funeral cover. Non-rider members receive Funeral cover for themselves and up to 3 named household members.',
          'You are responsible for keeping your password and phone secure. Anything done from your account is treated as done by you. Tell us at once if you suspect misuse.',
          'One person may hold one account. Duplicate or shared accounts may be closed.',
          'We record the date, time and version of the Terms you accepted.',
        ]} />

        <H id="cover">2. Cover, waiting period and premiums</H>
        <P>Cover amounts are the maximum we pay per event, and apply only while your policy is active and paid up.</P>
        <div className="table-wrap" style={{ marginBottom: 12 }}>
          <table style={{ tableLayout: 'auto' }}>
            <thead><tr><th>Plan</th><th>Premium</th><th>Cover</th></tr></thead>
            <tbody>
              <tr><td>Bail</td><td>KES 20 per day</td><td>Bail up to KES 20,000</td></tr>
              <tr><td>Bail + Income Stipend</td><td>KES 40 per day</td><td>Bail up to KES 20,000, plus income stipend up to KES 15,000</td></tr>
              <tr><td>Funeral</td><td>KES 15 per day</td><td>Up to KES 200,000</td></tr>
            </tbody>
          </table>
        </div>
        <UL items={[
          'Waiting period. No claim can be made until 5 months after your registration date. Claims for events before that date are declined.',
          'Payments. Premiums are paid by M-Pesa. A payment counts only once we receive confirmation. If premiums lapse, cover is suspended until you are paid up, and the waiting period does not restart unless we tell you so in writing.',
          'No refunds. Premiums already earned are not refundable, except where we cancel in error.',
          'Changes to amounts. Premiums and cover may change with 30 days notice. The current amounts always appear in the app.',
        ]} />

        <H id="claims">3. Claims and exclusions</H>
        <P>Submit every claim in the app, within 30 days of the event, with the documents we ask for.</P>
        <UL items={[
          'Bail: police abstract or occurrence number, your ID, and proof the motorcycle was in use for riding at the time.',
          'Income stipend: medical or hospital report showing you cannot ride.',
          'Funeral: death certificate or burial permit, the deceased\'s ID or birth certificate, and proof of relationship for household members.',
          'We may ask for more information and may verify with police, hospitals and the registrar. We aim to decide within 14 working days of receiving complete documents.',
        ]} />
        <P><strong>Not covered:</strong> events during the waiting period or while unpaid; events caused by your own crime, intentional self-harm or fraud; riding under the influence of alcohol or drugs; riding without a valid licence where one is required; war, riot or terrorism; and any claim above the stated cover amount.</P>

        <H id="kyc">4. KYC, fraud and next of kin</H>
        <UL items={[
          'Identity checks. Cover starts only after we approve your KYC documents (National ID and photos). Submitting false, altered or someone else\'s documents is grounds for rejection.',
          'Fraud. A false statement, forged document or exaggerated claim voids the claim, may cancel your policy without refund, and may be reported to the police and the Insurance Regulatory Authority.',
          'Next of kin and household members. You confirm each person you name has agreed to be listed and that you may share their details with us. Next of kin accounts are linked to your member account and may be used to confirm a funeral claim and receive payment.',
          'Accuracy. Keep your phone, county and next of kin details current. We are not liable for payments sent to details you gave us that are out of date.',
        ]} />

        <H id="privacy">5. Privacy Policy</H>
        <P>{COMPANY.name} is the data controller for the personal data described here, handled under the Kenya Data Protection Act, 2019.</P>
        <UL items={[
          'What we collect: full name, phone number, National ID number, county, ID and KYC photos, next of kin and household details, payment records, claim documents, and basic device and login information.',
          'Why: to verify identity, run your policy, process payments and claims, prevent fraud, meet legal duties and contact you about your cover.',
          'Consent. By ticking the acceptance box you consent to this use, including of ID documents. You may withdraw consent, but we may then be unable to provide cover.',
          'Sharing: only with service providers who help us run the service (such as payment, SMS and file storage providers), underwriters or insurers where applicable, regulators, and police when the law requires. We do not sell your data.',
          'Security and retention: passwords are stored hashed, data is sent over encrypted connections, and we keep records only as long as needed for your policy and legal obligations.',
          'Your rights: to access, correct or delete your data, to object to processing, and to complain to the Office of the Data Protection Commissioner. Write to us using the contact details in section 7.',
          'Dependants\' data. You confirm you may give us the details of next of kin and household members.',
        ]} />

        <H id="liability">6. Liability, disputes and governing law</H>
        <UL items={[
          `${COMPANY.name} pays only the benefits described in section 2. We are not liable for indirect losses, lost profits or events outside our control, such as network, M-Pesa or power outages, to the extent the law allows.`,
          'Nothing here limits liability that cannot be limited by Kenyan law, or your rights as a consumer.',
          'Complaints. Contact support first. We will acknowledge within 3 working days and aim to resolve within 21 days.',
          'Disputes. If unresolved, the parties will try mediation before court. You may also approach the Insurance Regulatory Authority or the Office of the Data Protection Commissioner.',
          'These Terms are governed by the laws of Kenya and disputes go to Kenyan courts.',
        ]} />

        <H id="contact">7. Changes, suspension and contact details</H>
        <UL items={[
          'Changes. We may update these Terms. We will notify you in the app at least 30 days before material changes take effect; continuing to use the service means you accept them.',
          'Suspension and termination. We may suspend or end your account for non-payment, fraud, false information or misuse. You may close your account at any time; premiums paid are not refunded.',
          'Contact. Toll-free 0800 724 547, WhatsApp +254 700 000 001, email info@pikishield.co.ke, SMS HELP to 22547. Support hours 8am to 6pm.',
        ]} />
        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)' }}>
          {COMPANY.legalName} - {COMPANY.regNo} - {COMPANY.address}
        </div>
      </div>
    </div>
  );
}
