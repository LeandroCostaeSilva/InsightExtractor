import nodemailer from 'nodemailer';
import crypto from 'crypto';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure with Gmail or other SMTP service
    // For development, we'll use ethereal email for testing
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Production email configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Development - create test account
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"PDF Insight Extractor" <noreply@pdfinsight.com>',
      to: email,
      subject: 'Recuperação de Senha - PDF Insight Extractor',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">PDF Insight Extractor</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Recuperação de Senha</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Recebemos uma solicitação para redefinir sua senha. Se você não fez esta solicitação, 
              pode ignorar este email com segurança.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;
                        font-weight: bold;">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              Este link expira em 1 hora por segurança. Se o botão não funcionar, 
              copie e cole o seguinte link no seu navegador:
            </p>
            
            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; 
                      word-break: break-all; font-size: 12px; color: #666;">
              ${resetUrl}
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; 
                      font-size: 12px; color: #666;">
            <p style="margin: 0;">
              Este é um email automático. Por favor, não responda.
            </p>
          </div>
        </div>
      `,
      text: `
        PDF Insight Extractor - Recuperação de Senha
        
        Recebemos uma solicitação para redefinir sua senha. 
        
        Para redefinir sua senha, acesse o link abaixo:
        ${resetUrl}
        
        Este link expira em 1 hora por segurança.
        
        Se você não fez esta solicitação, pode ignorar este email.
        
        Este é um email automático. Por favor, não responda.
      `
    };

    const info = await this.transporter.sendMail(mailOptions);
    
    // Log preview URL for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  }

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  getTokenExpiration(): Date {
    // Token expires in 1 hour
    return new Date(Date.now() + 60 * 60 * 1000);
  }
}

export const emailService = new EmailService();