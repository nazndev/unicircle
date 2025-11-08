'use client';

import { useEffect } from 'react';

// Suppress Ant Design React 19 compatibility warning immediately (before React renders)
// This warning is a false positive - Next.js 16.0.1 works with React 18.3.1
if (typeof window !== 'undefined') {
  // Suppress console.warn
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.length > 0 ? String(args[0] || '') : '';
    if (
      message.includes('antd: compatible') ||
      message.includes('React is 16 ~ 18') ||
      message.includes('antd v5 support React') ||
      message.includes('u.ant.design/v5-for-19') ||
      message.includes('[antd: Input]') ||
      message.includes('[antd: Form.Item]') ||
      message.includes('addonAfter') ||
      message.includes('Space.Compact') ||
      message.includes('deprecated') ||
      message.includes('single child element')
    ) {
      return; // Suppress Ant Design warnings
    }
    originalWarn.apply(console, args);
  };

  // Suppress console.error (Next.js devtools might use console.error)
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args.length > 0 ? String(args[0] || '') : '';
    // Check all args for Ant Design warnings
    const allMessages = args.map(arg => String(arg || '')).join(' ');
    if (
      message.includes('antd: compatible') ||
      message.includes('React is 16 ~ 18') ||
      message.includes('antd v5 support React') ||
      message.includes('u.ant.design/v5-for-19') ||
      message.includes('[antd: Input]') ||
      message.includes('[antd: Form.Item]') ||
      message.includes('addonAfter') ||
      message.includes('Space.Compact') ||
      message.includes('deprecated') ||
      message.includes('single child element') ||
      allMessages.includes('[antd: Input]') ||
      allMessages.includes('[antd: Form.Item]') ||
      allMessages.includes('addonAfter') ||
      allMessages.includes('deprecated') ||
      allMessages.includes('single child element')
    ) {
      return; // Suppress Ant Design warnings
    }
    originalError.apply(console, args);
  };
}

export default function SuppressWarnings() {
  // Component exists to ensure this module is loaded early
  return null;
}

