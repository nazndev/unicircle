// This file MUST be imported before any Ant Design imports
// It patches console.warn and console.error to suppress Ant Design React 19 compatibility warnings

if (typeof window !== 'undefined') {
  // Store original functions
  const originalWarn = console.warn;
  const originalError = console.error;

  // Patch console.warn
  console.warn = (...args: any[]) => {
    const message = args.length > 0 ? String(args[0] || '') : '';
    if (
      message.includes('antd: compatible') ||
      message.includes('React is 16 ~ 18') ||
      message.includes('antd v5 support React') ||
      message.includes('u.ant.design/v5-for-19') ||
      message.includes('[antd: compatible]') ||
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

  // Patch console.error (Next.js devtools intercepts warnings as errors)
  console.error = (...args: any[]) => {
    const message = args.length > 0 ? String(args[0] || '') : '';
    // Check all args for Ant Design warnings
    const allMessages = args.map(arg => String(arg || '')).join(' ');
    if (
      message.includes('antd: compatible') ||
      message.includes('React is 16 ~ 18') ||
      message.includes('antd v5 support React') ||
      message.includes('u.ant.design/v5-for-19') ||
      message.includes('[antd: compatible]') ||
      message.includes('[antd: Input]') ||
      message.includes('[antd: Form.Item]') ||
      message.includes('addonAfter') ||
      message.includes('Space.Compact') ||
      message.includes('deprecated') ||
      message.includes('single child element') ||
      allMessages.includes('[antd: Input]') ||
      allMessages.includes('addonAfter') ||
      allMessages.includes('deprecated')
    ) {
      return; // Suppress Ant Design warnings
    }
    originalError.apply(console, args);
  };
}

// Also patch on server side (for SSR)
if (typeof global !== 'undefined' && global.console) {
  const originalWarn = global.console.warn;
  const originalError = global.console.error;

  global.console.warn = (...args: any[]) => {
    const message = args.length > 0 ? String(args[0] || '') : '';
    if (
      message.includes('antd: compatible') ||
      message.includes('React is 16 ~ 18') ||
      message.includes('antd v5 support React') ||
      message.includes('u.ant.design/v5-for-19') ||
      message.includes('[antd: compatible]') ||
      message.includes('[antd: Input]') ||
      message.includes('[antd: Form.Item]') ||
      message.includes('addonAfter') ||
      message.includes('Space.Compact') ||
      message.includes('deprecated') ||
      message.includes('single child element')
    ) {
      return;
    }
    originalWarn.apply(global.console, args);
  };

  global.console.error = (...args: any[]) => {
    const message = args.length > 0 ? String(args[0] || '') : '';
    // Check all args for Ant Design warnings
    const allMessages = args.map(arg => String(arg || '')).join(' ');
    if (
      message.includes('antd: compatible') ||
      message.includes('React is 16 ~ 18') ||
      message.includes('antd v5 support React') ||
      message.includes('u.ant.design/v5-for-19') ||
      message.includes('[antd: compatible]') ||
      message.includes('[antd: Input]') ||
      message.includes('[antd: Form.Item]') ||
      message.includes('addonAfter') ||
      message.includes('Space.Compact') ||
      message.includes('deprecated') ||
      message.includes('single child element') ||
      allMessages.includes('[antd: Input]') ||
      allMessages.includes('addonAfter') ||
      allMessages.includes('deprecated')
    ) {
      return;
    }
    originalError.apply(global.console, args);
  };
}

