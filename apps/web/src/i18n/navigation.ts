import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** 用呢啲取代 next/link 同 next/navigation，locale 前綴會自動處理。 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
