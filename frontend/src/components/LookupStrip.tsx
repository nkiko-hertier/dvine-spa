import { useState } from 'react';
import { Search } from 'lucide-react';
import { getGetBookingRequestsLookupQueryKey, useGetBookingRequestsLookup } from '@/api';
import { StatusBadge } from '@/components/StatusBadge';

export function LookupStrip() {
  const [params, setParams] = useState<{ reference: string; phone_number: string } | null>(null);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const lookup = useGetBookingRequestsLookup(params ?? { reference: '', phone_number: '' }, {
    query: { enabled: !!params, queryKey: getGetBookingRequestsLookupQueryKey(params ?? { reference: '', phone_number: '' }) },
  });
  return (
    <div className="lookup-strip">
      <div>
        <span className="eyebrow">Find a request</span>
        <strong>Track by reference</strong>
      </div>
      <input data-testid="input-lookup-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="DV-1048" />
      <input data-testid="input-lookup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
      <button data-testid="button-lookup-request" className="button button-outline" disabled={!reference || !phone} onClick={() => setParams({ reference, phone_number: phone })}>
        <Search size={15} /> Look up
      </button>
      {lookup.data?.data && (
        <div className="lookup-result">
          <StatusBadge status={lookup.data.data.status} />
          <span>{lookup.data.data.treatment_name}</span>
        </div>
      )}
    </div>
  );
}
