import HomePage, { generateMetadata as metadata } from '@/components/routes/home-page';

const params = Promise.resolve({ lang: 'en' });
export default function Page() {
  return <HomePage params={params} />;
}
export const generateMetadata = () => metadata({ params });
