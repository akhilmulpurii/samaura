/**
 * Device detection utilities for optimizing streaming parameters
 * based on device capabilities and limitations
 */

export interface DeviceInfo {
  isIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportedCodecs: {
    h264: boolean;
    h265: boolean;
    vp9: boolean;
    av1: boolean;
  };
  recommendedBitrate: number;
  maxBitrate: number;
}

/**
 * Detects the current device and its capabilities
 */
export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    // Server-side fallback - assume mobile-friendly defaults
    return {
      isIOS: false,
      isIPad: false,
      isIPhone: false,
      isAndroid: false,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      supportedCodecs: {
        h264: true,
        h265: false,
        vp9: false,
        av1: false,
      },
      recommendedBitrate: 3000000, // 3Mbps
      maxBitrate: 6000000, // 6Mbps
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod|ios/.test(userAgent);
  const isIPad = /ipad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPhone = /iphone/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = /mobi|android|iphone|ipad|ipod/.test(userAgent);
  const isTablet = isIPad || (/android/.test(userAgent) && !/mobile/.test(userAgent));
  const isDesktop = !isMobile;

  // Detect codec support
  const video = document.createElement('video');
  const supportedCodecs = {
    h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
    h265: video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== '',
    vp9: video.canPlayType('video/webm; codecs="vp9"') !== '',
    av1: video.canPlayType('video/mp4; codecs="av01.0.05M.08"') !== '',
  };

  // Determine recommended bitrates based on device
  let recommendedBitrate = 3000000; // Default 3Mbps
  let maxBitrate = 6000000; // Default 6Mbps

  if (isDesktop) {
    recommendedBitrate = 8000000; // 8Mbps for desktop
    maxBitrate = 20000000; // 20Mbps max for desktop
  } else if (isTablet) {
    recommendedBitrate = 5000000; // 5Mbps for tablets
    maxBitrate = 10000000; // 10Mbps max for tablets
  } else if (isMobile) {
    recommendedBitrate = 2000000; // 2Mbps for mobile
    maxBitrate = 4000000; // 4Mbps max for mobile
  }

  // iOS devices have specific limitations
  if (isIOS) {
    // iOS prefers H.264, limit bitrates for battery life
    maxBitrate = Math.min(maxBitrate, 8000000); // Cap at 8Mbps for iOS
    
    if (isIPhone) {
      recommendedBitrate = 2000000; // 2Mbps for iPhone
      maxBitrate = 4000000; // 4Mbps max for iPhone
    }
  }

  return {
    isIOS,
    isIPad,
    isIPhone,
    isAndroid,
    isMobile,
    isTablet,
    isDesktop,
    supportedCodecs,
    recommendedBitrate,
    maxBitrate,
  };
}

/**
 * Gets optimal streaming parameters based on device capabilities
 */
export function getOptimalStreamingParams(deviceInfo?: DeviceInfo): {
  videoCodec: string;
  audioCodec: string;
  container: string;
  profile: string;
  level: string;
  videoBitrate: number;
  maxVideoBitrate: number;
  audioBitrate: number;
  audioSampleRate: number;
  audioChannels: number;
  segmentContainer: string;
  minSegments: number;
  forceTranscode: boolean;
} {
  const device = deviceInfo || detectDevice();

  let videoCodec = 'h264'; // Default to H.264 for maximum compatibility
  let profile = 'high';
  let level = '4.1';

  // Optimize codec selection based on device support
  if (device.supportedCodecs.h265 && !device.isIOS) {
    // H.265 can provide better compression, but avoid on iOS due to battery concerns
    videoCodec = 'h265,h264'; // Fallback to H.264 if H.265 fails
    profile = 'main';
    level = '5.1';
  }

  // iOS-specific optimizations
  if (device.isIOS) {
    videoCodec = 'h264'; // Stick with H.264 for iOS
    profile = 'high'; // High profile works well on modern iOS devices
    level = '4.1'; // Level 4.1 is widely supported
  }

  return {
    videoCodec,
    audioCodec: 'aac', // AAC is universally supported
    container: 'ts', // MPEG-TS for HLS
    profile,
    level,
    videoBitrate: device.recommendedBitrate,
    maxVideoBitrate: device.maxBitrate,
    audioBitrate: device.isMobile ? 128000 : 256000, // Lower audio bitrate on mobile
    audioSampleRate: 48000, // 48kHz is standard
    audioChannels: 2, // Stereo
    segmentContainer: 'ts',
    minSegments: device.isMobile ? 2 : 3, // Fewer segments for mobile for faster startup
    forceTranscode: device.isIOS || device.isAndroid, // Force transcoding on mobile for consistency
  };
}

/**
 * Checks if HLS is supported on the current device
 */
export function isHLSSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  const video = document.createElement('video');
  return video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
         video.canPlayType('application/x-mpegURL') !== '';
}

/**
 * Gets user-friendly device name for debugging
 */
export function getDeviceName(deviceInfo?: DeviceInfo): string {
  const device = deviceInfo || detectDevice();
  
  if (device.isIPhone) return 'iPhone';
  if (device.isIPad) return 'iPad';
  if (device.isIOS) return 'iOS Device';
  if (device.isAndroid && device.isTablet) return 'Android Tablet';
  if (device.isAndroid) return 'Android Phone';
  if (device.isDesktop) return 'Desktop';
  if (device.isTablet) return 'Tablet';
  if (device.isMobile) return 'Mobile Device';
  
  return 'Unknown Device';
}
