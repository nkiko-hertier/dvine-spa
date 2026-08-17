import { useState } from 'react';
import { Filter, RefreshCw, Search } from 'lucide-react';
import { useGetAdminCustomers } from '@/api';
import { PageHeader } from '@/components/PageHeader';
import { SkeletonRows } from '@/components/SkeletonRows';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { CustomerRow } from '@/components/CustomerRow';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const customers = useGetAdminCustomers({ search: search || undefined, sort: 'last_activity_desc', limit: '50' });
  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="People worth remembering"
        title="Customers"
        description="Every visit is a relationship in progress."
        action={
          <button data-testid="button-refresh-customers" className="icon-button" onClick={() => customers.refetch()}>
            <RefreshCw size={17} />
          </button>
        }
      />
      <div className="list-toolbar">
        <label className="search-field large">
          <Search size={17} />
          <input data-testid="input-search-customers" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone" />
        </label>
        <button data-testid="button-filter-customers" className="button button-outline">
          <Filter size={15} /> Filters
        </button>
        <span className="toolbar-count">{customers.data?.meta?.total ?? 0} people</span>
      </div>
      <section className="surface customer-list">
        <div className="customer-list-head">
          <span>Customer</span>
          <span>Latest visit</span>
          <span>Visits</span>
        </div>
        {customers.isLoading ? (
          <SkeletonRows count={5} />
        ) : customers.isError ? (
          <ErrorState retry={() => customers.refetch()} />
        ) : customers.data?.data?.length ? (
          customers.data.data.map((customer) => <CustomerRow customer={customer} key={customer.id} />)
        ) : (
          <EmptyState title="No customers match that" text="Try a name, number, or a softer search." />
        )}
      </section>
    </div>
  );
}
