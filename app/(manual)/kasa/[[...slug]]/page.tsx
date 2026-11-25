import { ManualPage, manualMetadata, manualParams, type ManualProps } from '@/components/manual-page';

export default function Page(props: ManualProps) {
  return <ManualPage section="kasa" {...props} />;
}
export const generateStaticParams = () => manualParams('kasa');
export const generateMetadata = (props: ManualProps) => manualMetadata('kasa', props);
