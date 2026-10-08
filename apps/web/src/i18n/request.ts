import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { deepHans } from '@/lib/hans';

/* 簡體冇自己嘅 messages 檔：由繁體轉（lib/hans.ts），轉一次就記住 */
let hansMessages: Record<string, unknown> | null = null;

async function messagesFor(locale: string): Promise<Record<string, unknown>> {
  if (locale !== 'zh-Hans') return (await import(`../../messages/${locale}.json`)).default;
  hansMessages ??= deepHans((await import('../../messages/zh-Hant.json')).default as Record<string, unknown>);
  return hansMessages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: await messagesFor(locale),
  };
});
