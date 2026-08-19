import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { ENDPOINTS } from "../../lib/endpoints";
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
} from "../../lib/helpers";
import type { Category } from "../../types";

export default function DashboardCategories(): React.ReactElement {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const itemsPerPage = 5;

  const { data: categoriesData, isLoading, isError } = useAdminCategories({
    page,
    limit: itemsPerPage,
    search: searchQuery || undefined,
    sort: "display_order",
  });

  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId("");
    setName("");
    setDescription("");
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (category: Category) => {
    setIsEditing(true);
    setCurrentId(category.id);
    setName(category.name);
    setDescription(category.description ?? "");
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) {
      setFormError("Please provide a category name.");
      return;
    }

    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
    };

    try {
      if (isEditing) {
        await apiClient.patch(
          ENDPOINTS.admin.categories.updateCategoryById(currentId),
          body
        );
        queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      } else {
        await createCategory.mutateAsync(body);
      }
      setIsFormModalOpen(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: { field?: string; issue: string }[] } } } };
      const apiErr = axiosErr.response?.data?.error;
      if (apiErr?.details?.length) {
        setFormError(apiErr.details.map((d) => d.issue).join(", "));
      } else {
        setFormError(apiErr?.message || "Failed to save category. Please try again.");
      }
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      try {
        await deleteCategory.mutateAsync(category.id);
      } catch {
        window.alert("Failed to delete category. Please try again.");
      }
    }
  };

  const currentTableData = categoriesData?.data ?? [];
  const total = categoriesData?.meta?.total ?? 0;
  const totalPages = categoriesData?.meta?.total_pages ?? 1;

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          title="Service Categories"
          subtitle="Organize catalog sections, slugs, and service classifications."
        />

        <main className="p-8 space-y-8">
          {/* ACTIONS & SEARCH BAR HEADER */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#EFECE6] p-4 sm:p-6 border border-stone-300/85 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by category name, slug, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
              />
            </div>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center space-x-2 bg-[#1C3A27] text-[#F8F6F0] px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Category</span>
            </button>
          </div>

          {/* TABLE SECTION */}
          <div className="bg-[#EFECE6] border border-stone-300/85 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-stone-300/60 mb-6">
              <div>
                <h2 className="font-serif text-2xl text-[#1C3A27]">Categories List</h2>
                <p className="text-xs text-stone-600 font-light mt-0.5">
                  Showing {total === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} total categories
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">Loading categories...</p>
              ) : isError ? (
                <p className="text-center text-red-700 italic py-10 text-xs">Couldn't load categories.</p>
              ) : currentTableData.length === 0 ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">No categories found matching your search criteria.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 text-stone-500 uppercase tracking-widest text-[10px]">
                      <th className="py-3 px-4 font-semibold">ID</th>
                      <th className="py-3 px-4 font-semibold">Category Name</th>
                      <th className="py-3 px-4 font-semibold">Slug</th>
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-300/60 text-[#1C3A27]">
                    {currentTableData.map((category) => (
                      <tr key={category.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                        <td className="py-4 px-4 font-medium text-stone-500">{category.id.slice(0, 8).toUpperCase()}</td>
                        <td className="py-4 px-4 font-semibold">{category.name}</td>
                        <td className="py-4 px-4 text-stone-600 font-mono text-[11px]">
                          {category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                        </td>
                        <td className="py-4 px-4 text-stone-700 max-w-xs truncate">{category.description ?? "—"}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold ${
                            category.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"
                          }`}>
                            {category.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(category)}
                            className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="Edit Category"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            className="p-1.5 text-red-600 hover:text-red-800 transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-stone-300/60 text-xs">
                <span className="text-stone-600 font-light">
                  Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="p-2 bg-[#F8F6F0] border border-stone-300 text-stone-700 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-2 bg-[#F8F6F0] border border-stone-300 text-stone-700 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ADD / EDIT CATEGORY MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-md shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Sanctuary Administration
                </span>
                <h3 className="font-serif text-xl">{isEditing ? "Edit Category" : "Create New Category"}</h3>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="text-stone-300 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hydrotherapy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of this category..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>

                {formError && (
                  <p className="text-red-700 text-xs bg-red-50 p-3 border border-red-200">{formError}</p>
                )}
              </div>

              <div className="bg-stone-200/60 px-6 py-4 border-t border-stone-300 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-stone-300 text-stone-800 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-stone-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategory.isPending}
                  className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm disabled:opacity-50"
                >
                  {isEditing ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}