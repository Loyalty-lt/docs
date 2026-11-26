import { manualRoute } from '@/components/manual-page';

const route = manualRoute('till', 'en');
export default route.Page;
export const dynamicParams = false;
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
