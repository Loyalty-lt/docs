import { manual } from '@/lib/manual';
import { createFromSource } from 'fumadocs-core/search/server';

export const { GET } = createFromSource(manual);
