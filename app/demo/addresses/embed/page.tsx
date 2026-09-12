import { AddressWidgetDemo } from '@/components/address-widget-demo';

/** Tas pats demo, skirtas įdėti per iframe dokumentacijoje. */
export const metadata = { title: 'Address widget', robots: { index: false } };

export default function Page() {
  return <AddressWidgetDemo embedded />;
}
