/**
 * Security utilities for input validation and sanitization
 */

// Allowed protocols for external URLs
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Blocked domains (known malicious or suspicious)
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'example.com',
  'test.com'
];

/**
 * Validates if a URL is safe to load as an image
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsedUrl = new URL(url);
    
    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Check for blocked domains
    if (BLOCKED_DOMAINS.includes(parsedUrl.hostname.toLowerCase())) {
      return false;
    }
    
    // Check for common image extensions
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const hasValidExtension = validExtensions.some(ext => 
      parsedUrl.pathname.toLowerCase().endsWith(ext)
    );
    
    // Allow if it has a valid extension or is from a known image hosting service
    const knownImageHosts = ['imgur.com', 'github.com', 'githubusercontent.com', 'cloudinary.com'];
    const isKnownHost = knownImageHosts.some(host => 
      parsedUrl.hostname.toLowerCase().includes(host)
    );
    
    return hasValidExtension || isKnownHost;
  } catch {
    return false;
  }
}

/**
 * Validates if a URL is safe for external links
 */
export function isValidExternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsedUrl = new URL(url);
    
    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Check for blocked domains
    if (BLOCKED_DOMAINS.includes(parsedUrl.hostname.toLowerCase())) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes text input to prevent XSS
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Safe image component props
 */
export function getSafeImageProps(src: string, alt: string) {
  const isValidSrc = isValidImageUrl(src);
  
  return {
    src: isValidSrc ? src : '/images/placeholder.png', // Fallback to placeholder
    alt: sanitizeText(alt),
    onError: () => {
      console.warn('Failed to load image:', src);
    },
    loading: 'lazy' as const,
    decoding: 'async' as const
  };
}