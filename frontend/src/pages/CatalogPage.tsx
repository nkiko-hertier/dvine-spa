import { useState } from 'react';
import { ChevronRight, Flower2, Plus, RefreshCw, Search } from 'lucide-react';
import {
  getGetCategoriesByIdQueryKey,
  getGetCategoriesByIdTreatmentsQueryKey,
  getGetTreatmentsByIdQueryKey,
  useGetAdminCategories,
  useGetAdminTreatments,
  useGetCategories,
  useGetCategoriesById,
  useGetCategoriesByIdTreatments,
  useGetTreatments,
  useGetTreatmentsById,
} from '@/api';
import { fmtMoney } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { CatalogEditDrawer } from '@/components/CatalogEditDrawer';
import { CreateCategoryDialog } from '@/components/CreateCategoryDialog';
import { CreateTreatmentDialog } from '@/components/CreateTreatmentDialog';

export function CatalogPage() {
  const [tab, setTab] = useState<'treatments' | 'categories'>('treatments');
  const [search, setSearch] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [createCategory, setCreateCategory] = useState(false);
  const [createTreatment, setCreateTreatment] = useState(false);
  const categories = useGetAdminCategories({ search: search || undefined, limit: '100' });
  const treatments = useGetAdminTreatments({ search: search || undefined, limit: '100' });
  const publicCategories = useGetCategories({ is_active: 'true' });
  const publicTreatments = useGetTreatments({ limit: '100' });
  const publicCategoryDetail = useGetCategoriesById(selectedCategory ?? '', { query: { enabled: !!selectedCategory, queryKey: getGetCategoriesByIdQueryKey(selectedCategory ?? '') } });
  const categoryTreatments = useGetCategoriesByIdTreatments(selectedCategory ?? '', { query: { enabled: !!selectedCategory, queryKey: getGetCategoriesByIdTreatmentsQueryKey(selectedCategory ?? '') } });
  const treatmentDetail = useGetTreatmentsById(selectedTreatment ?? '', { query: { enabled: !!selectedTreatment, queryKey: getGetTreatmentsByIdQueryKey(selectedTreatment ?? '') } });

  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="The menu of care"
        title="Catalog"
        description={`${publicCategories.data?.data?.length ?? categories.data?.data?.length ?? 0} active categories · ${publicTreatments.data?.data?.length ?? treatments.data?.data?.length ?? 0} treatments`}
        action={
          <button
            data-testid="button-refresh-catalog"
            className="icon-button"
            onClick={() => {
              categories.refetch();
              treatments.refetch();
            }}
          >
            <RefreshCw size={17} />
          </button>
        }
      />
      <div className="catalog-toolbar">
        <div className="segmented">
          <button data-testid="tab-treatments" className={tab === 'treatments' ? 'selected' : ''} onClick={() => setTab('treatments')}>
            Treatments <span>{treatments.data?.meta?.total ?? 0}</span>
          </button>
          <button data-testid="tab-categories" className={tab === 'categories' ? 'selected' : ''} onClick={() => setTab('categories')}>
            Categories <span>{categories.data?.meta?.total ?? 0}</span>
          </button>
        </div>
        <label className="search-field">
          <Search size={16} />
          <input data-testid="input-search-catalog" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab}`} />
        </label>
        <button
          data-testid={`button-add-${tab === 'treatments' ? 'treatment' : 'category'}`}
          className="button button-primary"
          onClick={() => (tab === 'treatments' ? setCreateTreatment(true) : setCreateCategory(true))}
        >
          <Plus size={15} /> Add {tab === 'treatments' ? 'treatment' : 'category'}
        </button>
      </div>
      {tab === 'treatments' ? (
        <section className="catalog-grid">
          {treatments.data?.data?.length ? (
            treatments.data.data.map((t) => (
              <button data-testid={`button-treatment-${t.id}`} className="catalog-card surface" onClick={() => setSelectedTreatment(t.id)} key={t.id}>
                <div className="catalog-image treatment-art">
                  <Flower2 size={27} />
                </div>
                <div className="catalog-card-body">
                  <div className="catalog-card-top">
                    <span className="eyebrow text-primary">{t.category?.name ?? 'Uncategorised'}</span>
                    {t.is_active === false && <span className="inactive-label">Hidden</span>}
                  </div>
                  <h3 className="display">{t.name}</h3>
                  <p>{t.description ?? 'A considered moment of care.'}</p>
                  <div className="catalog-meta">
                    <span>{t.duration_minutes} min</span>
                    <strong>{fmtMoney(t.price)}</strong>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <EmptyState title="No treatments yet" text="Add the first ritual to your menu." />
          )}
        </section>
      ) : (
        <section className="category-grid">
          {categories.data?.data?.length ? (
            categories.data.data.map((c) => (
              <button data-testid={`button-category-${c.id}`} className="category-card surface" onClick={() => setSelectedCategory(c.id)} key={c.id}>
                <div className="category-wash">
                  <span>{String(c.name).slice(0, 1)}</span>
                </div>
                <div>
                  <span className="eyebrow text-primary">{c.treatment_count ?? 0} treatments</span>
                  <h3 className="display">{c.name}</h3>
                  <p>{c.description ?? 'A collection of considered care.'}</p>
                </div>
                <ChevronRight size={17} />
              </button>
            ))
          ) : (
            <EmptyState title="No categories yet" text="Give your menu a beautiful beginning." />
          )}
        </section>
      )}
      {(selectedTreatment || selectedCategory) && (
        <CatalogEditDrawer
          treatmentId={selectedTreatment}
          categoryId={selectedCategory}
          treatment={treatmentDetail.data?.data}
          category={publicCategoryDetail.data?.data ?? categories.data?.data?.find((c) => c.id === selectedCategory)}
          categoryTreatments={categoryTreatments.data?.data}
          onClose={() => {
            setSelectedTreatment(null);
            setSelectedCategory(null);
          }}
        />
      )}
      {createCategory && <CreateCategoryDialog onClose={() => setCreateCategory(false)} />}
      {createTreatment && <CreateTreatmentDialog categories={categories.data?.data ?? []} onClose={() => setCreateTreatment(false)} />}
    </div>
  );
}
