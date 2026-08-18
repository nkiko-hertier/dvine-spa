import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import DashboardHeader from "../../components/DashboardHeader";
import { 
  Briefcase, 
  Search, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  category: string;
  price: string;
  duration: string;
  description: string;
}

export default function DashboardServices(): React.ReactElement {
  // Available categories based on the sanctuary's catalog
  const availableCategories = [
    "Signature Massages",
    "Advanced Facials",
    "Body Treatments",
    "Aromatherapy",
    "Hydrotherapy",
    "Wellness Packages"
  ];

  // Initial Mock Services State
  const [services, setServices] = useState<Service[]>([
    { id: "SRV-101", name: "Signature Renewal Massage", category: "Signature Massages", price: "RWF 45,000", duration: "60 mins", description: "A deeply restorative full-body massage using organic essential oils." },
    { id: "SRV-102", name: "Deep Hydration Facial", category: "Advanced Facials", price: "RWF 35,000", duration: "45 mins", description: "Intense moisture infusion for radiant and revitalized skin texture." },
    { id: "SRV-103", name: "Aromatherapy Full Body", category: "Aromatherapy", price: "RWF 50,000", duration: "75 mins", description: "Custom botanical blends designed to calm the nervous system." },
    { id: "SRV-104", name: "Hot Stone Therapy", category: "Signature Massages", price: "RWF 60,000", duration: "90 mins", description: "Smooth basalt stones applied with warm therapeutic oils." },
    { id: "SRV-105", name: "Organic Rose Facial", category: "Advanced Facials", price: "RWF 40,000", duration: "50 mins", description: "Calming botanical extracts tailored for sensitive skin profiles." },
    { id: "SRV-106", name: "Deep Tissue Relief", category: "Signature Massages", price: "RWF 55,000", duration: "60 mins", description: "Targeted pressure techniques to release chronic muscle tension." },
    { id: "SRV-107", name: "Botanical Body Scrub", category: "Body Treatments", price: "RWF 38,000", duration: "45 mins", description: "Exfoliating sea salt and herbal scrub for skin renewal." },
    { id: "SRV-108", name: "Swedish Relaxation", category: "Signature Massages", price: "RWF 42,000", duration: "60 mins", description: "Classic long gliding strokes to encourage total body relaxation." },
  ]);

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // View Modal State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [category, setCategory] = useState<string>(availableCategories[0]);
  const [price, setPrice] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Handlers for View Modal
  const handleOpenViewModal = (service: Service) => {
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
    setCurrentId("");
    setName("");
    setCategory(availableCategories[0]);
    setPrice("");
    setDuration("");
    setDescription("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (service: Service) => {
    setIsEditing(true);
    setCurrentId(service.id);
    setName(service.name);
    setCategory(service.category);
    setPrice(service.price);
    setDuration(service.duration);
    setDescription(service.description);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !duration) {
      alert("Please fill in all required fields.");
      return;
    }

    if (isEditing) {
      // Update existing service
      setServices((prev) =>
        prev.map((s) =>
          s.id === currentId
            ? { ...s, name, category, price, duration, description }
            : s
        )
      );
    } else {
      // Create new service
      const newService: Service = {
        id: `SRV-${Math.floor(100 + Math.random() * 900)}`,
        name,
        category,
        price,
        duration,
        description: description || "Custom sanctuary service."
      };
      setServices([newService, ...services]);
    }

    setIsFormModalOpen(false);
  };

  // Handler for Deleting Service
  const handleDeleteService = (id: string) => {
    if (window.confirm(`Are you sure you want to delete service ${id}?`)) {
      setServices((prev) => prev.filter((s) => s.id !== id));
      if (selectedService && selectedService.id === id) {
        handleCloseViewModal();
      }
    }
  };

  // Filter Services based on Search Query
  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Calculations
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
      
      {/* SIDEBAR COMPONENT */}
      <Sidebar />

      {/* MAIN DASHBOARD CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* DASHBOARD HEADER COMPONENT */}
        <DashboardHeader 
          title="Sanctuary Services" 
          subtitle="Manage catalog items, pricing, categories, and descriptions." 
        />

        {/* DASHBOARD BODY */}
        <main className="p-8 space-y-8">
          
          {/* ACTIONS & SEARCH BAR HEADER */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#EFECE6] p-4 sm:p-6 border border-stone-300/85 shadow-sm">
            
            {/* Search Input */}
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
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
              />
            </div>

            {/* New Service Button */}
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
                  Showing {filteredServices.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredServices.length)} of {filteredServices.length} total services
                </p>
              </div>
            </div>

            {/* TABLE WRAPPER */}
            <div className="overflow-x-auto">
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
                  {currentTableData.length > 0 ? (
                    currentTableData.map((service) => (
                      <tr key={service.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                        <td className="py-4 px-4 font-medium text-stone-500">{service.id}</td>
                        <td className="py-4 px-4 font-semibold">{service.name}</td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold bg-stone-200 text-stone-800">
                            {service.category}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-medium text-emerald-800">{service.price}</td>
                        <td className="py-4 px-4 text-stone-600 font-light">{service.duration}</td>
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
                            onClick={() => handleDeleteService(service.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 transition-colors inline-flex items-center justify-center bg-[#F8F6F0] border border-stone-300"
                            title="Delete Service"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-500 italic">
                        No services found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-stone-300/60 text-xs">
                <span className="text-stone-600 font-light">
                  Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-[#F8F6F0] border border-stone-300 text-stone-700 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
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
                <h3 className="font-serif text-xl">{selectedService.id}</h3>
              </div>
              <button 
                onClick={handleCloseViewModal}
                className="text-stone-300 hover:text-white transition-colors p-1"
              >
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
                    {selectedService.category}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-[#F8F6F0] p-4 border border-stone-300/60">
                <div className="flex justify-between border-b border-stone-300/50 pb-2">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Price:</span>
                  <span className="font-semibold text-emerald-800 text-sm">{selectedService.price}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">Duration:</span>
                  <span className="font-medium text-[#1C3A27]">{selectedService.duration}</span>
                </div>
              </div>

              <div className="bg-[#F8F6F0] p-4 border border-stone-300/60">
                <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Description</span>
                <p className="text-stone-700 font-light leading-relaxed">{selectedService.description}</p>
              </div>
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
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="text-stone-300 hover:text-white transition-colors p-1"
              >
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
                  <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] focus:outline-none focus:border-[#1C3A27]"
                  >
                    {availableCategories.map((cat, index) => (
                      <option key={index} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Price (e.g. RWF 45,000) *</label>
                    <input
                      type="text"
                      required
                      placeholder="RWF 45,000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full p-2.5 bg-[#F8F6F0] border border-stone-300 text-xs text-[#1C3A27] placeholder-stone-400 focus:outline-none focus:border-[#1C3A27]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Duration *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 60 mins"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
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
                  className="bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#0A2619] transition-colors shadow-sm"
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