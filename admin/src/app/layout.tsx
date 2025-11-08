// CRITICAL: Import warning suppression FIRST, before ANY Ant Design imports
// This must be the very first import to ensure warnings are suppressed before Ant Design loads
import '@/lib/suppress-antd-warning';

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConfigProvider } from 'antd';
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import 'antd/dist/reset.css';
import SuppressWarnings from '@/components/SuppressWarnings';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UniCircle Admin Portal",
  description: "Admin dashboard for UniCircle platform",
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  const originalWarn = console.warn;
                  const originalError = console.error;
                  
                  console.warn = function(...args) {
                    const msg = args[0] ? String(args[0]) : '';
                    if (msg.includes('antd: compatible') || msg.includes('React is 16 ~ 18') || msg.includes('antd v5 support React') || msg.includes('u.ant.design/v5-for-19') || msg.includes('[antd: compatible]') || msg.includes('[antd: Input]') || msg.includes('[antd: Form.Item]') || msg.includes('addonAfter') || msg.includes('Space.Compact') || msg.includes('single child element')) {
                      return;
                    }
                    originalWarn.apply(console, args);
                  };
                  
                  console.error = function(...args) {
                    const msg = args[0] ? String(args[0]) : '';
                    if (msg.includes('antd: compatible') || msg.includes('React is 16 ~ 18') || msg.includes('antd v5 support React') || msg.includes('u.ant.design/v5-for-19') || msg.includes('[antd: compatible]') || msg.includes('[antd: Input]') || msg.includes('[antd: Form.Item]') || msg.includes('addonAfter') || msg.includes('Space.Compact') || msg.includes('single child element')) {
                      return;
                    }
                    originalError.apply(console, args);
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <SuppressWarnings />
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#5C7AEA',
              borderRadius: 8,
            },
          }}
        >
          {children}
          <Toaster position="top-right" />
        </ConfigProvider>
      </body>
    </html>
  );
}
