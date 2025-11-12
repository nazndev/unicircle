import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    // Verify connection on startup
    this.transporter.verify().then(() => {
      this.logger.log('SMTP connection verified');
    }).catch((error) => {
      this.logger.error('SMTP connection failed:', error);
    });
  }

  async sendVerificationCode(email: string, code: string, retries = 2): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.transporter.sendMail({
          from,
          to: email,
          subject: 'UniCircle Verification Code',
          html: `
            <h2>Your UniCircle Verification Code</h2>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          `,
        });
        
        this.logger.log(`Verification code email sent successfully to ${email}`);
        return; // Success, exit retry loop
      } catch (error: any) {
        this.logger.error(
          `Failed to send verification code to ${email} (attempt ${attempt + 1}/${retries + 1}):`,
          error.message || error
        );
        
        if (attempt === retries) {
          // Last attempt failed, throw error
          throw new Error(
            `Failed to send verification email after ${retries + 1} attempts. ` +
            `Please check your email configuration or try again later.`
          );
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  async sendAlumniApprovalNotification(email: string, approved: boolean) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    
    if (approved) {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'UniCircle Alumni Account Approved',
        html: `
          <h2>Welcome to UniCircle!</h2>
          <p>Your alumni account has been approved. You can now access all features of UniCircle.</p>
          <p>Log in to your account to get started.</p>
        `,
      });
    } else {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'UniCircle Alumni Account Review',
        html: `
          <h2>Account Review Update</h2>
          <p>Unfortunately, your alumni verification request could not be approved at this time.</p>
          <p>Please contact support if you have questions.</p>
        `,
      });
    }
  }

  async sendInstitutionRequestNotification(
    email: string,
    institutionName: string,
    institutionType: 'university' | 'organization' | null,
    approved: boolean,
  ) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    const typeLabel = institutionType === 'organization' ? 'organization' : 'university';
    
    if (approved) {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: `Institution Request Approved - UniCircle`,
        html: `
          <h2>Great News!</h2>
          <p>Your request to add <strong>${institutionName}</strong> to UniCircle has been approved by our admin team.</p>
          <p>Our team has added your ${typeLabel} to the platform as a <strong>${typeLabel}</strong>. You can now register and connect with others from your ${typeLabel}.</p>
          <p>Thank you for your patience!</p>
          <p>Best regards,<br>The UniCircle Team</p>
        `,
      });
    } else {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Institution Request Update - UniCircle',
        html: `
          <h2>Institution Request Update</h2>
          <p>Thank you for your request to add <strong>${institutionName}</strong> to UniCircle.</p>
          <p>Unfortunately, we are unable to approve your request at this time. This could be due to various reasons such as:</p>
          <ul>
            <li>The institution may already exist in our system</li>
            <li>Additional verification may be required</li>
            <li>The request may not meet our current criteria</li>
          </ul>
          <p>If you have any questions or would like to provide additional information, please contact our support team.</p>
          <p>Thank you for your interest in UniCircle.</p>
          <p>Best regards,<br>The UniCircle Team</p>
        `,
      });
    }
  }

  // Backward compatibility
  async sendUniversityRequestNotification(email: string, institutionName: string, approved: boolean) {
    return this.sendInstitutionRequestNotification(email, institutionName, 'university', approved);
  }

  async sendVendorApplicationNotification(email: string, businessName: string) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Vendor Application Received - UniCircle',
      html: `
        <h2>Vendor Application Received</h2>
        <p>Thank you for applying to become a vendor on UniCircle!</p>
        <p>Your application for <strong>${businessName}</strong> has been received and is under review.</p>
        <p>Our admin team will review your application within 24 hours. You will receive an email notification once a decision has been made.</p>
        <p>Best regards,<br>The UniCircle Team</p>
      `,
    });
  }

  async sendVendorApprovalNotification(email: string, businessName: string, approved: boolean) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    if (approved) {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Vendor Application Approved - UniCircle',
        html: `
          <h2>Congratulations!</h2>
          <p>Your vendor application for <strong>${businessName}</strong> has been approved!</p>
          <p>You can now:</p>
          <ul>
            <li>Add your business locations</li>
            <li>Create product and service listings</li>
            <li>Run campaigns to reach students</li>
            <li>Start receiving orders</li>
          </ul>
          <p>Log in to your vendor dashboard to get started.</p>
          <p>Best regards,<br>The UniCircle Team</p>
        `,
      });
    } else {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Vendor Application Update - UniCircle',
        html: `
          <h2>Vendor Application Update</h2>
          <p>Thank you for your interest in becoming a vendor on UniCircle.</p>
          <p>Unfortunately, we are unable to approve your application for <strong>${businessName}</strong> at this time.</p>
          <p>If you have questions, please contact our support team.</p>
          <p>Best regards,<br>The UniCircle Team</p>
        `,
      });
    }
  }

  async sendOrderNotification(email: string, orderId: string, status: string, orderDetails?: any) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    const statusMessages: Record<string, { subject: string; message: string }> = {
      created: {
        subject: 'Order Created - UniCircle',
        message: 'Your order has been created and is awaiting vendor confirmation.',
      },
      confirmed: {
        subject: 'Order Confirmed - UniCircle',
        message: 'Your order has been confirmed by the vendor and is being prepared.',
      },
      fulfilled: {
        subject: 'Order Fulfilled - UniCircle',
        message: 'Your order has been fulfilled! Thank you for your purchase.',
      },
      cancelled: {
        subject: 'Order Cancelled - UniCircle',
        message: 'Your order has been cancelled.',
      },
    };

    const statusInfo = statusMessages[status] || {
      subject: 'Order Update - UniCircle',
      message: `Your order status has been updated to: ${status}`,
    };

    await this.transporter.sendMail({
      from,
      to: email,
      subject: statusInfo.subject,
      html: `
        <h2>Order Update</h2>
        <p>${statusInfo.message}</p>
        <p>Order ID: ${orderId}</p>
        ${orderDetails ? `<p>Total: ${orderDetails.total}</p>` : ''}
        <p>Best regards,<br>The UniCircle Team</p>
      `,
    });
  }

  async sendMatchNotification(email: string, matchedUserName: string) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    
    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'New Match on UniCircle!',
      html: `
        <h2>You have a new match! 💜</h2>
        <p>You and ${matchedUserName} have matched on UniCircle!</p>
        <p>Start a conversation now.</p>
      `,
    });
  }

  async sendWeeklyRevealNotification(email: string, revealCount: number) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    
    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Weekly Crush Reveal',
      html: `
        <h2>Your Weekly Crush Reveal</h2>
        <p>You have ${revealCount} new mutual crushes this week!</p>
        <p>Check your matches to see who it is.</p>
      `,
    });
  }

  async sendNameVerificationNotification(email: string, approved: boolean, reason?: string) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    
    if (approved) {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'UniCircle Name Verification Approved',
        html: `
          <h2>Name Verification Approved</h2>
          <p>Congratulations! Your name verification has been approved by our admin team.</p>
          <p>Your name is now verified and cannot be changed. This helps maintain trust and authenticity on the platform.</p>
          <p>Thank you for verifying your identity with UniCircle.</p>
        `,
      });
    } else {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'UniCircle Name Verification Update',
        html: `
          <h2>Name Verification Update</h2>
          <p>Unfortunately, your name verification request could not be approved at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please ensure your documents clearly show your name and are valid. You can submit a new verification request with updated documents.</p>
          <p>If you have any questions, please contact our support team.</p>
        `,
      });
    }
  }

  async sendPasswordResetCode(email: string, code: string, retries = 2): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.transporter.sendMail({
          from,
          to: email,
          subject: 'UniCircle Password Reset Code',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Your reset code is: <strong>${code}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, never share this code with anyone.</p>
          `,
        });
        
        this.logger.log(`Password reset code email sent successfully to ${email}`);
        return; // Success, exit retry loop
      } catch (error: any) {
        this.logger.error(
          `Failed to send password reset code to ${email} (attempt ${attempt + 1}/${retries + 1}):`,
          error.message || error
        );
        
        if (attempt === retries) {
          // Last attempt failed, throw error
          throw new Error(
            `Failed to send password reset email after ${retries + 1} attempts. ` +
            `Please check your email configuration or try again later.`
          );
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
}

