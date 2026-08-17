import { X, Trash2 } from 'lucide-react';
import {
  getGetAdminCategoriesByIdQueryKey,
  getGetAdminCategoriesQueryKey,
  getGetAdminTreatmentsByIdQueryKey,
  getGetAdminTreatmentsQueryKey,
  useDeleteAdminCategoriesById,
  useDeleteAdminTreatmentsById,
  useGetAdminCategoriesById,
  useGetAdminTreatmentsById,
  useUpdateAdminCategoriesById,
  useUpdateAdminTreatmentsById,
} from '@/api';
import type { Category, Treatment } from '@/api';
import { fmtMoney } from '@/lib/format';
import { queryClient } from '@/lib/query-client';
import { SkeletonRows } from '@/components/SkeletonRows';

export function CatalogEditDrawer({
  treatmentId,
  categoryId,
  treatment,
  category,
  categoryTreatments,
  onClose,
}: {
  treatmentId: string | null;
  categoryId: string | null;
  treatment?: Treatment;
  category?: Category;
  categoryTreatments?: Treatment[];
  onClose: () => void;
}) {
  const adminTreatment = useGetAdminTreatmentsById(treatmentId ?? '', { query: { enabled: !!treatmentId, queryKey: getGetAdminTreatmentsByIdQueryKey(treatmentId ?? '') } });
  const adminCategory = useGetAdminCategoriesById(categoryId ?? '', { query: { enabled: !!categoryId, queryKey: getGetAdminCategoriesByIdQueryKey(categoryId ?? '') } });
  const updateTreatment = useUpdateAdminTreatmentsById();
  const updateCategory = useUpdateAdminCategoriesById();
  const deleteTreatment = useDeleteAdminTreatmentsById();
  const deleteCategory = useDeleteAdminCategoriesById();
  const adminTitle = treatment?.name ?? category?.name ?? adminTreatment.data?.data?.name ?? adminCategory.data?.data?.name ?? 'Loading…';

  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" onClick={onClose} aria-label="Close catalog detail" />
      <aside className="detail-drawer compact">
        <div className="drawer-head">
          <div>
            <span className="eyebrow text-primary">{treatmentId ? 'Treatment' : 'Category'} detail</span>
            <h2 className="display">{adminTitle}</h2>
          </div>
          <button data-testid="button-close-catalog-detail" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {treatmentId && treatment ? (
          <>
            <p className="drawer-copy">{treatment.description ?? 'A quiet invitation to take care.'}</p>
            <div className="detail-grid">
              <div>
                <small>Duration</small>
                <strong>{treatment.duration_minutes} minutes</strong>
              </div>
              <div>
                <small>Price</small>
                <strong>{fmtMoney(treatment.price)}</strong>
              </div>
              <div>
                <small>Category</small>
                <strong>{treatment.category?.name ?? 'Uncategorised'}</strong>
              </div>
            </div>
            <div className="drawer-actions">
              <button
                data-testid="button-toggle-treatment"
                className="button button-primary"
                onClick={() =>
                  updateTreatment.mutate(
                    { id: treatment.id, data: { is_active: treatment.is_active === false } },
                    { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTreatmentsQueryKey() }); onClose(); } },
                  )
                }
              >
                {treatment.is_active === false ? 'Publish treatment' : 'Hide treatment'}
              </button>
              <button
                data-testid="button-delete-treatment"
                className="button button-quiet danger-text"
                onClick={() => {
                  if (window.confirm('Hide this treatment from the menu?'))
                    deleteTreatment.mutate(
                      { id: treatment.id },
                      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminTreatmentsQueryKey() }); onClose(); } },
                    );
                }}
              >
                <Trash2 size={15} /> Remove
              </button>
            </div>
          </>
        ) : categoryId && category ? (
          <>
            <p className="drawer-copy">{category.description ?? 'A considered collection of treatments.'}</p>
            <div className="detail-block">
              <span className="eyebrow">Treatments in this category</span>
              {categoryTreatments?.length ? (
                categoryTreatments.map((t) => (
                  <div className="simple-list-row" key={t.id}>
                    <span>{t.name}</span>
                    <small>{t.duration_minutes} min</small>
                  </div>
                ))
              ) : (
                <p className="muted">No treatments here yet.</p>
              )}
            </div>
            <div className="drawer-actions">
              <button
                data-testid="button-toggle-category"
                className="button button-primary"
                onClick={() =>
                  updateCategory.mutate(
                    { id: category.id, data: { is_active: category.is_active === false } },
                    { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminCategoriesQueryKey() }); onClose(); } },
                  )
                }
              >
                {category.is_active === false ? 'Publish category' : 'Hide category'}
              </button>
              <button
                data-testid="button-delete-category"
                className="button button-quiet danger-text"
                onClick={() => {
                  if (window.confirm('Hide this category and its menu grouping?'))
                    deleteCategory.mutate(
                      { id: category.id },
                      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminCategoriesQueryKey() }); onClose(); } },
                    );
                }}
              >
                <Trash2 size={15} /> Remove
              </button>
            </div>
          </>
        ) : (
          <SkeletonRows count={2} />
        )}
      </aside>
    </div>
  );
}
