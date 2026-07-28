import nodemailer from 'nodemailer';

export const sendOTPEmail = async (toEmail, otp) => {
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASS?.trim();

    console.log('\n========================================');
    console.log(`[OTP SYSTEM] Sending OTP for ${toEmail}: ${otp}`);
    console.log(`[OTP SYSTEM] Using Email: ${emailUser}`);
    console.log('========================================\n');

    if (!emailUser || emailUser === 'your-email@gmail.com' || !emailPass || emailPass === 'your-app-password') {
        console.log('[Nodemailer WARNING] Using console log mode for OTP because default email credentials were found in .env');
        return { success: true, simulated: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: emailUser,
                pass: emailPass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: `"Auth Security" <${emailUser}>`,
            to: toEmail,
            subject: 'Your Verification Code (OTP)',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    <h2 style="color: #4f46e5; text-align: center; margin-bottom: 8px;">Verification Code</h2>
                    <p style="color: #4b5563; font-size: 15px;">Hello,</p>
                    <p style="color: #4b5563; font-size: 15px;">Use the following One-Time Password (OTP) code to verify your account or reset your password:</p>
                    <div style="background-color: #f3f4f6; padding: 18px; text-align: center; border-radius: 8px; margin: 24px 0;">
                        <span style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #1e1b4b;">${otp}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 13px;">This OTP will expire in <strong>10 minutes</strong>. If you did not request this code, please ignore this email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Nodemailer SUCCESS] Email sent successfully! MessageId: ${info.messageId}`);
        return { success: true };
    } catch (err) {
        console.error('[Nodemailer ERROR] Failed to send email via SMTP:');
        console.error(err);
        return { success: false, error: err.message };
    }
};
