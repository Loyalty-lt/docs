import { ManualPage, manualMetadata, manualParams, type ManualProps } from '@/components/manual-page';

export default function Page(props: ManualProps) {
  return <ManualPage section="partneriams" {...props} />;
}
export const generateStaticParams = () => manualParams('partneriams');
export const generateMetadata = (props: ManualProps) => manualMetadata('partneriams', props);
