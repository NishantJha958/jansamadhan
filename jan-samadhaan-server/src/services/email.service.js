const nodemailer = require('nodemailer');

const EMAIL_CONFIG = {
  host: process.env.SMTP_SERVER || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  senderEmail: process.env.SENDER_EMAIL || '',
  senderPassword: process.env.SENDER_PASSWORD || '',
  senderName: process.env.SENDER_NAME || 'भारत ई-शिकायत प्रणाली | Bharat E-Grievance',
};

function createTransporter() {
  if (!EMAIL_CONFIG.senderEmail || !EMAIL_CONFIG.senderPassword) return null;
  return nodemailer.createTransport({
    host: EMAIL_CONFIG.host,
    port: 465, // Use 465 for secure Gmail connection
    secure: true, // true for 465, false for other ports
    auth: { user: EMAIL_CONFIG.senderEmail, pass: EMAIL_CONFIG.senderPassword },
    // Render network fix: Explicitly force IPv4 socket connection
    // because Render instances often fail to connect to Gmail via IPv6
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    // The definitive fix for Render + Gmail timeouts:
    family: 4
  });
}

async function sendEmail(toEmail, subject, htmlContent) {
  if (!toEmail) return false;
  try {
    const transporter = createTransporter();
    if (!transporter) { console.log('⚠️  Email not configured, skipping.'); return false; }
    await transporter.sendMail({
      from: `"${EMAIL_CONFIG.senderName}" <${EMAIL_CONFIG.senderEmail}>`,
      to: toEmail, subject, html: htmlContent,
    });
    console.log(`✅ Email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`❌ Email error: ${err.message}`);
    return false;
  }
}

function sendEmailAsync(toEmail, subject, htmlContent) {
  setImmediate(() => sendEmail(toEmail, subject, htmlContent));
}

function getOTPEmailTemplate(otp, phone, purpose = 'Sign In') {
  return `<html><head><style>
    body{font-family:'Segoe UI',sans-serif;color:#333}
    .container{max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px}
    .header{background:linear-gradient(135deg,#FF9933,#138808);color:white;padding:25px;text-align:center}
    .content{padding:30px}
    .otp-box{background:#f8f9fa;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#FF9933;border:2px dashed #FF9933;border-radius:8px;margin:20px 0}
    .footer{background:#f1f1f1;padding:15px;text-align:center;font-size:12px;color:#777}
  </style></head><body>
    <div class="container">
      <div class="header"><h1>🔐 Your OTP Code</h1></div>
      <div class="content">
        <p>Dear Citizen,</p>
        <p>Your OTP for <strong>${purpose}</strong> to Jan Samadhaan portal is:</p>
        <div class="otp-box">${otp}</div>
        <p><strong>⏰ Valid for 5 minutes only</strong></p>
        <p>Mobile Number: ${phone}</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </div>
      <div class="footer">भारत ई-शिकायत प्रणाली | Bharat E-Grievance</div>
    </div>
  </body></html>`;
}

function getComplaintSubmittedTemplate(data) {
  const mapLink = data.latitude && data.longitude
    ? `<p><strong>📍 Location:</strong> <a href="https://www.google.com/maps?q=${data.latitude},${data.longitude}" style="background:#138808;color:white;padding:6px 12px;border-radius:4px;text-decoration:none;">View on Map</a></p>`
    : '';
  return `<html><head><style>
    body{font-family:'Segoe UI','Noto Sans',sans-serif;color:#333;line-height:1.8}
    .container{max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px}
    .header{background:linear-gradient(135deg,#FF9933,#138808);color:white;padding:25px;text-align:center}
    .content{padding:30px;background:#fff}
    .info-box{background:#f8f9fa;padding:15px;border-left:4px solid #FF9933;margin:20px 0;border-radius:4px}
    .footer{background:#f1f1f1;padding:15px;text-align:center;font-size:12px;color:#777}
  </style></head><body>
    <div class="container">
      <div class="header"><h1>🇮🇳 Complaint Registered | शिकायत दर्ज</h1></div>
      <div class="content">
        <p>Dear <strong>${data.citizen_name}</strong>,</p>
        <p>Your complaint has been registered successfully.</p>
        <div class="info-box">
          <p><strong>Tracking ID:</strong> ${data.tracking_id}</p>
          <p><strong>Priority:</strong> P-${data.priority}</p>
          <p><strong>Department:</strong> ${data.department}</p>
          <p><strong>SLA Deadline:</strong> ${data.sla_deadline}</p>
          ${mapLink}
        </div>
      </div>
      <div class="footer">भारत ई-शिकायत प्रणाली | Bharat E-Grievance</div>
    </div>
  </body></html>`;
}

module.exports = { sendEmail, sendEmailAsync, getOTPEmailTemplate, getComplaintSubmittedTemplate };
