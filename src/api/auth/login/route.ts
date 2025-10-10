import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, setServerUrl } from '@/app/actions/auth';

export async function POST(request: NextRequest) {
  try {
    const { serverUrl, username, password } = await request.json();

    if (!serverUrl || !username) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Set server URL first
    await setServerUrl(serverUrl);

    // Attempt authentication
    const success = await authenticateUser(username, password);

    if (success) {
      // Get user data from the server actions
      const { getUser, getServerUrl } = await import('@/app/actions/auth');
      const user = await getUser();
      const finalServerUrl = await getServerUrl();

      return NextResponse.json({
        success: true,
        user,
        serverUrl: finalServerUrl,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
