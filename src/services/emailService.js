const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

// Cấu hình transporter (sử dụng SMTP của Gmail làm ví dụ)
// Trong môi trường production, bạn nên dùng các dịch vụ như SendGrid, Mailgun, AWS SES
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (toEmail, username, verificationLink) => {
  const appName = "LEXIAI"; // Tên ứng dụng của bạn
  const mailOptions = {
    from: `"${appName} Support" <${process.env.SMTP_USER}>`, // Người gửi hiển thị
    to: toEmail,
    subject: `Xác thực tài khoản của bạn tại ${appName}`,
    html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                    <h1 style="color: #4CAF50; margin: 0;">Chào mừng đến với ${appName}!</h1>
                </div>
                <div style="padding: 20px 0;">
                    <p>Xin chào <strong>${username}</strong>,</p>
                    <p>Cảm ơn bạn đã đăng ký tài khoản tại ${appName}! Để hoàn tất quá trình đăng ký và bắt đầu hành trình học từ vựng cùng trợ lý Gemini siêu dễ thương, vui lòng xác thực địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Xác thực tài khoản của tôi</a>
                    </p>
                    <p>Nếu nút trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt của mình:</p>
                    <p style="word-break: break-all; font-size: 14px; color: #555;">${verificationLink}</p>
                    <p>Liên kết này sẽ hết hạn sau 24 giờ vì lý do bảo mật. Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.</p>
                    <p>Trân trọng,<br>Đội ngũ ${appName}</p>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} ${appName}. Tất cả quyền được bảo lưu.</p>
                    <p>Địa chỉ: 123 Đường Học Tập, Thành phố Kiến Thức</p>
                </div>
            </div>
        `,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    logger.info(`Email xác thực đã gửi tới ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Lỗi gửi email xác thực tới ${toEmail}: ${error.message}`);
    throw new Error(
      "Không thể gửi email xác thực. Vui lòng kiểm tra cấu hình SMTP hoặc thử lại sau."
    );
  }
};

module.exports = { sendVerificationEmail };
