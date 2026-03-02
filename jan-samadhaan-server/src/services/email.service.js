const { Resend } = require('resend');

// If no RESEND_API_KEY is provided, we fall back to a mock/logger for development
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_please_replace');

const EMAIL_CONFIG = {
  // If you don't have a custom domain on Resend yet, we will use Resend's default onboarding domain for testing
  // You must verify your own domain on Resend to send to any email address.
  // For testing, Resend only allows sending TO the email address you signed up with.
  senderEmail: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
  senderName: process.env.SENDER_NAME || 'Bharat E-Grievance',
};

async function sendEmail(toEmail, subject, htmlContent) {
  if (!toEmail) return false;

  if (!process.env.RESEND_API_KEY) {
    console.log(`⚠️  Resend not configured! (Missing RESEND_API_KEY in .env)`);
    console.log(`Mock sent email to: ${toEmail} | Subject: ${subject}`);
    return true; // Pretend it succeeds for development if no key is set
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${EMAIL_CONFIG.senderName} <${EMAIL_CONFIG.senderEmail}>`,
      to: [toEmail],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error(`❌ Resend API Error:`, error);
      return false;
    }

    console.log(`✅ Email sent to ${toEmail} via Resend (ID: ${data.id})`);
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
