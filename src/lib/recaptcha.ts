export type RecaptchaAction = 'contact';

interface GrecaptchaInstance {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaInstance;
  }
}

interface RecaptchaConfigResponse {
  enabled: boolean;
  siteKey: string | null;
}

const SITE_KEY_REGEX = /^[A-Za-z0-9_-]{10,128}$/;

let cachedConfigPromise: Promise<RecaptchaConfigResponse> | null = null;
let loadedScriptSiteKey: string | null = null;
let scriptLoadPromise: Promise<void> | null = null;

export async function getRecaptchaConfig(): Promise<RecaptchaConfigResponse> {
  if (!cachedConfigPromise) {
    cachedConfigPromise = (async () => {
      try {
        const res = await fetch('/api/recaptcha/config', {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const data = (await res.json()) as RecaptchaConfigResponse;
          if (data.enabled && data.siteKey && SITE_KEY_REGEX.test(data.siteKey)) {
            return { enabled: true, siteKey: data.siteKey };
          }
        }
      } catch {
        // Fall through to build-time VITE_RECAPTCHA_SITE_KEY check if available
      }

      const envKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();
      if (SITE_KEY_REGEX.test(envKey)) {
        return { enabled: true, siteKey: envKey };
      }

      return { enabled: false, siteKey: null };
    })();
  }
  return cachedConfigPromise;
}

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (!SITE_KEY_REGEX.test(siteKey)) {
    return Promise.reject(new Error('Invalid reCAPTCHA site key format.'));
  }
  if (window.grecaptcha && loadedScriptSiteKey === siteKey) {
    return Promise.resolve();
  }
  if (scriptLoadPromise && loadedScriptSiteKey === siteKey) {
    return scriptLoadPromise;
  }

  loadedScriptSiteKey = siteKey;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-corpus-recaptcha="v3"]'
    );
    if (existingScript) {
      if (window.grecaptcha) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google reCAPTCHA v3 script.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.corpusRecaptcha = 'v3';
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Google reCAPTCHA v3 script.'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/** Preloads Google reCAPTCHA v3 script silently when configured in .env */
export async function preloadRecaptcha(): Promise<boolean> {
  const config = await getRecaptchaConfig();
  if (!config.enabled || !config.siteKey) {
    return false;
  }
  try {
    await loadRecaptchaScript(config.siteKey);
    return true;
  } catch {
    return false;
  }
}

/** Executes Google reCAPTCHA v3 for the specified action and returns the signed token */
export async function executeRecaptcha(
  action: RecaptchaAction
): Promise<{ token: string | null; configured: boolean }> {
  const config = await getRecaptchaConfig();
  if (!config.enabled || !config.siteKey) {
    return { token: null, configured: false };
  }

  await loadRecaptchaScript(config.siteKey);

  const token = await new Promise<string>((resolve, reject) => {
    if (!window.grecaptcha) {
      reject(new Error('Google reCAPTCHA v3 is unavailable. Please disable script blockers and retry.'));
      return;
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha!
        .execute(config.siteKey!, { action })
        .then(resolve)
        .catch(() =>
          reject(new Error('Google reCAPTCHA v3 token generation failed. Please try again.'))
        );
    });
  });

  return { token, configured: true };
}
