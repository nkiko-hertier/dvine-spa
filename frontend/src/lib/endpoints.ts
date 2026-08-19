/**
 * Every backend endpoint path, in one place.
 *
 * Mirrors backend/src/routes exactly:
 *   - `public.*`  -> mounted at app root, no auth (categories, treatments, booking-requests)
 *   - `admin.*`   -> mounted at /admin, requires a Clerk session (apiClient attaches it automatically)
 *
 * Each leaf is a function that returns the path (even ones with no
 * parameters, e.g. `getAllTreatments()`) so usage is consistent everywhere:
 *
 *   apiClient.get(ENDPOINTS.admin.treatments.getAllTreatments())
 *   apiClient.get(ENDPOINTS.admin.customers.getCustomerById(customerId))
 *   apiClient.patch(ENDPOINTS.admin.bookingRequests.updateBookingRequestStatus(id), { status })
 */
export const ENDPOINTS = {
  public: {
    categories: {
      getAllCategories: () => `/categories`,
      getCategoryById: (id: string) => `/categories/${id}`,
      getTreatmentsByCategoryId: (id: string) => `/categories/${id}/treatments`,
    },
    treatments: {
      getAllTreatments: () => `/treatments`,
      getTreatmentById: (id: string) => `/treatments/${id}`,
    },
    bookingRequests: {
      createBookingRequest: () => `/booking-requests`,
      lookupBookingRequest: () => `/booking-requests/lookup`,
      easyLookupBookingRequest: () => `/booking-requests/easy-lookup`,
    },
  },

  admin: {
    dashboard: {
      getSummary: () => `/admin/dashboard/summary`,
      getStats: () => `/admin/dashboard/stats`,
    },
    categories: {
      getAllCategories: () => `/admin/categories`,
      getCategoryById: (id: string) => `/admin/categories/${id}`,
      createCategory: () => `/admin/categories`,
      updateCategoryById: (id: string) => `/admin/categories/${id}`,
      deleteCategoryById: (id: string) => `/admin/categories/${id}`,
    },
    treatments: {
      getAllTreatments: () => `/admin/treatments`,
      getTreatmentById: (id: string) => `/admin/treatments/${id}`,
      createTreatment: () => `/admin/treatments`,
      updateTreatmentById: (id: string) => `/admin/treatments/${id}`,
      deleteTreatmentById: (id: string) => `/admin/treatments/${id}`,
    },
    customers: {
      getAllCustomers: () => `/admin/customers`,
      getCustomerById: (id: string) => `/admin/customers/${id}`,
      updateCustomerById: (id: string) => `/admin/customers/${id}`,
    },
    bookingRequests: {
      getAllBookingRequests: () => `/admin/booking-requests`,
      getBookingRequestById: (id: string) => `/admin/booking-requests/${id}`,
      updateBookingRequestById: (id: string) => `/admin/booking-requests/${id}`,
    },
    staff: {
      getAllStaff: () => `/admin/staff`,
      inviteStaff: () => `/admin/staff/invite`,
      updateStaffById: (id: string) => `/admin/staff/${id}`,
      deleteStaffById: (id: string) => `/admin/staff/${id}`,
    },
    auditLogs: {
      getAllAuditLogs: () => `/admin/audit-logs`,
    },
  },
} as const;
