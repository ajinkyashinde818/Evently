require('dotenv').config();
const transporter = require('./config/mail');

console.log('Testing email configuration...');
console.log('Email user:', process.env.EMAIL_USER);

const mailOptions = {
  from: `Evently <${process.env.EMAIL_USER}>`,
  to: 'shewalepiyush64@gmail.com',
  subject: 'Test Email from Evently - Registration System',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4f6df5; text-align: center;">🎫 Evently Email Test</h2>
      <p>If you received this email, the registration system email configuration is working correctly!</p>
      <p>Time sent: ${new Date().toLocaleString()}</p>
    </div>
  `
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Email send failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  } else {
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('📧 Accepted:', info.accepted);
    process.exit(0);
  }
});
