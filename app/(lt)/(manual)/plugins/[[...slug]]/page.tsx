import { manualRoute } from '@/components/manual-page';

const route = manualRoute('plugins', 'lt');
export default route.Page;
export const dynamicParams = false;
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
