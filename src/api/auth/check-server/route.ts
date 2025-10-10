import { NextRequest, NextResponse } from 'next/server';
import { checkServerHealth } from '@/app/actions/auth';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const result = await checkServerHealth(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Server health check API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
