import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import {
  Search,
  Plus,
  Eye,
  Edit3,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { ENDPOINTS } from "../../lib/endpoints";
import { useAdminTreatments, useCreateTreatment, useDeleteTreatment, useAdminCategories } from "../../lib/helpers";
import type { Treatment, TreatmentCreateInput } from "../../types";

export default function DashboardServices(): React.ReactElement {
  const queryClient = useQueryClient();

  // Real treatments from backend
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const itemsPerPage = 5;

  const { data: treatmentsData, isLoading, isError } = useAdminTreatments({
    page,
    limit: itemsPerPage,
    search: searchQuery || undefined,
    sort: "display_order",
  });

  const { data: categoriesData } = useAdminCategories({ limit: 100 });

  const createTreatment = useCreateTreatment();
  const deleteTreatment = useDeleteTreatment();

  // View Modal State
  const [selectedService, setSelectedService] = useState<Treatment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  const categories = categoriesData?.data ?? [];

  // Handlers for View Modal
  const handleOpenViewModal = (service: Treatment) => {
    setSelectedService(service);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedService(null);
  };

  // Handlers for Add / Edit Modal
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingId("");
    setName("");
    setCategoryId("");
    setPrice("");
    setDurationMinutes("");
    setDescription("");
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (service: Treatment) => {
    setIsEditing(true);
    setEditingId(service.id);
    setName(service.name);
    setCategoryId(service.category?.id ?? "");
    setPrice(service.price);
    setDurationMinutes(String(service.duration_minutes));
    setDescription(service.description ?? "");
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name || !price || !durationMinutes) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const parsedPrice = Number.parseFloat(price);
    const parsedDuration = Number.parseInt(durationMinutes, 10);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError("Price must be a positive number.");
      return;
    }
    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      setFormError("Duration must be a positive number of minutes.");
      return;
    }

    const body: TreatmentCreateInput = {
      name,
      category_id: categoryId || undefined,
      price: parsedPrice,
      duration_minutes: parsedDuration,
      description: description || undefined,
    };

    try {
      if (isEditing) {
        await apiClient.patch(
          ENDPOINTS.admin.treatments.updateTreatmentById(editingId),
          body
        );
        queryClient.invalidateQueries({ queryKey: ["admin", "treatments"] });
      } else {
        await createTreatment.mutateAsync(body);
      }
      setIsFormModalOpen(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: { field?: string; issue: string }[] } } } };
      const apiErr = axiosErr.response?.data?.error;
      if (apiErr?.details?.length) {
        setFormError(apiErr.details.map((d) => d.issue).join(", "));
      } else {
        setFormError(apiErr?.message || "Failed to save service. Please try again.");
      }
    }
  };

  // Handler for Deleting Service
  const handleDeleteService = async (id: string, serviceName: string) => {
    if (window.confirm(`Are you sure you want to delete service "${serviceName}"?`)) {
      try {
        await deleteTreatment.mutateAsync(id);
        if (selectedService && selectedService.id === id) {
          handleCloseViewModal();
        }
      } catch {
        window.alert("Failed to delete service. Please try again.");
      }
    }
  };

  const currentTableData = treatmentsData?.data ?? [];
  const total = treatmentsData?.meta?.total ?? 0;
  const totalPages = treatmentsData?.meta?.total_pages ?? 1;

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          title="Sanctuary Services"
          subtitle="Manage catalog items, pricing, categories, and descriptions."
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
                placeholder="Search by service name, category, or ID..."
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
              <span>New Service</span>
            </button>
          </div>

          {/* TABLE SECTION */}
          <div className="bg-[#EFECE6] border border-stone-300/85 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-stone-300/60 mb-6">
              <div>
                <h2 className="font-serif text-2xl text-[#1C3A27]">Services Catalog</h2>
                <p className="text-xs text-stone-600 font-light mt-0.5">
                  Showing {total === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} total services
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">Loading services...</p>
              ) : isError ? (
                <p className="text-center text-red-700 italic py-10 text-xs">Couldn't load services.</p>
              ) : currentTableData.length === 0 ? (
                <p className="text-center text-stone-500 italic py-10 text-xs">No services found matching your search criteria.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 text-stone-500 uppercase tracking-widest text-[10px]">
                      <th className="py-3 px-4 font-semibold">ID</th>
                      <th className="py-3 px-4 font-semibold">Service Name</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Price</th>
                      <th className="py-3 px-4 font-semibold">Duration</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-300/60 text-[#1C3A27]">
                    {currentTableData.map((service) => (
                      <tr key={service.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                        <td className="py-4 px-4 font-medium text-stone-500">{service.id.slice(0, 8).toUpperCase()}</td>
                        <td className="py-4 px-4 font-semibold">{service.name}</td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold bg-stone-200 text-stone-800">
                            {service.category?.name ?? "Uncategorized"}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-medium text-emerald-800">RWF {Number(service.price).toLocaleString()}</td>
                        <td className="py-4 px-4 text-stone-600 font-light">{service.duration_minutes} mins</td>
                        <td className="py-4 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenViewModal(service)}
                            className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="View Service Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(service)}
                            className="p-1.5 text-stone-600 hover:text-[#1C3A27] transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="Edit Service"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id, service.name)}
                            className="p-1.5 text-red-600 hover:text-red-800 transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="Delete Service"
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

      {/* VIEW SERVICE DETAILS MODAL */}
      {isViewModalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-lg shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Service Information
                </span>
                <h3 className="font-serif text-xl">{selectedService.id.slice(0, 8).toUpperCase()}</h3>
              </div>
              <button onClick={handleCloseViewModal} className="text-stone-300 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[#F8F6F0] p-4 border border-stone-300/60">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Service Name</span>
                  <span className="font-semibold text-[#1C3A27] text-sm">{selectedService.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Category</span>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold bg-stone-200 text-stone-800">
                    {selectedService.category?.name ?? "Uncategorized"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-[#F8F6F0] p-4 border border-stone-300/60">
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Price:</span>
                  <span className="font-semibold text-emerald-800 text-sm">RWF {Number(selectedService.price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Duration:</span>
                  <span className="font-medium text-[#1C3A27]">{selectedService.duration_minutes} minutes</span>
                </div>
              </div>

              {selectedService.description && (
                <div className="bg-[#F8F6F0] p-4 border border-stone-300/60">
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Description</span>
                  <p className="text-stone-700 font-light leading-relaxed">{selectedService.description}</p>
                </div>
              )}

              {selectedService.benefits?.length ? (
                <div className="bg-[#F8F6F0] p-4 border border-stone-300/60">
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Benefits</span>
                  <ul className="space-y-1">
                    {selectedService.benefits.map((b, i) => (
                      <li key={i} className="flex items-center space-x-2">
                        <span className="w-1 h-1 bg-[#1C3A27] rounded-full"></span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="bg-stone-200/60 px-6 py-4 border-t border-stone-300 flex justify-end">
              <button
                onClick={handleCloseViewModal}
                className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SERVICE MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#EFECE6] border border-stone-300 w-full max-w-lg shadow-xl overflow-hidden font-['Work_Sans',sans-serif]">
            <div className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 block">
                  Sanctuary Administration
                </span>
                <h3 className="font-serif text-xl">{isEditing ? "Edit Service" : "Create New Service"}</h3>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="text-stone-300 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Service Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hot Stone Therapy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Price (RWF) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="45000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Duration (minutes) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="60"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed overview of the treatment..."
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
                  disabled={createTreatment.isPending}
                  className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm disabled:opacity-50"
                >
                  {isEditing ? "Update Service" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}