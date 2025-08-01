# app/services/email_service.py
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

class EmailService:
    @staticmethod
    def send_invitation_email(email, token, inviter_name, role='admin'):
        """Send invitation email with registration link"""
        try:
            # Email configuration
            smtp_server = os.getenv('SMTP_HOST', 'smtp.gmail.com')
            smtp_port = int(os.getenv('SMTP_PORT', '587'))
            smtp_user = os.getenv('SMTP_USER')
            smtp_password = os.getenv('SMTP_PASSWORD')
            from_email = os.getenv('FROM_EMAIL', smtp_user)
            
            # 🔥 DEBUG OUTPUT
            print(f"📧 EMAIL DEBUG:")
            print(f"   To: {email}")
            print(f"   From: {from_email}")
            print(f"   SMTP Server: {smtp_server}:{smtp_port}")
            print(f"   SMTP User: {smtp_user}")
            print(f"   Has Password: {'Yes' if smtp_password else 'No'}")
            
            if not all([smtp_user, smtp_password]):
                error_msg = "Email configuration missing - check SMTP_USER and SMTP_PASSWORD in .env file"
                print(f"❌ {error_msg}")
                raise ValueError(error_msg)
            
            # Create invitation link
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
            invitation_link = f"{frontend_url}/register?token={token}"
            
            print(f"   Invitation Link: {invitation_link}")
            
            # Email content
            subject = f"Admin Account Invitation - {role.title()} Role"
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">You've been invited!</h2>
                    <p>Hello,</p>
                    <p><strong>{inviter_name}</strong> has invited you to join as a <strong>{role.title()}</strong>.</p>
                    <p>Click the button below to complete your registration:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invitation_link}" 
                           style="background-color: #007bff; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-weight: bold;">
                            Complete Registration
                        </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <strong>⚠️ Important:</strong> This invitation expires in 24 hours.
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; font-size: 12px; background-color: #f1f3f4; padding: 10px; border-radius: 3px;">
                        {invitation_link}
                    </p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">
                        If you didn't expect this invitation, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
            """
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = from_email
            msg['To'] = email
            
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            print("📧 Connecting to SMTP server...")
            
            # Send email
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                print("📧 Starting TLS...")
                server.starttls()
                print("📧 Logging in...")
                server.login(smtp_user, smtp_password)
                print("📧 Sending message...")
                server.send_message(msg)
                print("✅ Email sent successfully!")
            
            return True, "Email sent successfully"
            
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            print(f"❌ EMAIL ERROR: {error_msg}")
            if current_app:
                current_app.logger.error(error_msg)
            return False, error_msg