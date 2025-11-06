import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
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
  }

  async sendVerificationCode(email: string, code: string) {
    const from = this.configService.get<string>('SMTP_FROM', 'UniCircle <noreply@unicircle.app>');
    
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
}

