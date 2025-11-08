import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Get the admin token from cookie or Authorization header
    const token = request.cookies.get('admin_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    console.log('[Proxy Image] Request received:', {
      hasToken: !!token,
      tokenLength: token?.length,
      cookieNames: Array.from(request.cookies.getAll()).map(c => c.name),
      imageUrl: imageUrl?.substring(0, 100) // Log first 100 chars
    });

    if (!token) {
      console.error('[Proxy Image] No token found in cookies or headers');
      console.log('[Proxy Image] Available cookies:', Array.from(request.cookies.getAll()).map(c => ({ name: c.name, hasValue: !!c.value })));
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Reject local file paths (file://, /Users/, etc.)
    if (decodedUrl.startsWith('file://') || decodedUrl.includes('/Users/') || decodedUrl.includes('/Library/')) {
      console.error('[Proxy Image] Invalid local file path detected:', decodedUrl);
      return NextResponse.json(
        { error: 'Invalid image URL: local file paths are not allowed. Please upload the document to the server first.' },
        { status: 400 }
      );
    }
    
    // Construct the full URL if it's relative
    let fullUrl = decodedUrl;
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      fullUrl = `${API_BASE_URL}${decodedUrl.startsWith('/') ? decodedUrl : '/' + decodedUrl}`;
    }

    console.log('[Proxy Image] Fetching:', { 
      originalUrl: imageUrl, 
      decodedUrl, 
      fullUrl,
      hasToken: !!token 
    });

    // Fetch the image with authentication
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      // Don't follow redirects automatically
      redirect: 'follow',
    });

    console.log('[Proxy Image] Response:', { 
      status: response.status, 
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      url: response.url 
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy Image] Failed to fetch:', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      });
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log('[Proxy Image] Success:', { 
      size: imageBuffer.byteLength,
      contentType 
    });

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[Proxy Image] Error:', {
      message: error.message,
      stack: error.stack,
      imageUrl
    });
    return NextResponse.json(
      { error: `Failed to proxy image: ${error.message}` },
      { status: 500 }
    );
  }
}

