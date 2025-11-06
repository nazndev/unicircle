import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConfigProvider } from 'antd';
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import 'antd/dist/reset.css';

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
      <body className={inter.className}>
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
