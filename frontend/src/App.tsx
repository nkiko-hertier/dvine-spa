import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Serices";
import Contact from "./pages/Contact";
import Booking from "./pages/Booking";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import NotFound from "./pages/NotFound";
import DashbordServices from "./pages/admin/Services";
import DashboardBookings from "./pages/admin/Booking";
import DashboardCategories from "./pages/admin/Categories";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import UserManagement from "./pages/admin/UserManagement";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminOnlyRoute from "./components/AdminOnlyRoute";
import "./App.css"; 
import "./index.css";

export default function App() {
    return (
        <BrowserRouter>
            
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/services" element={<Services />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/login" element={<Login />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/services"
                    element={
                        <ProtectedRoute>
                            <DashbordServices />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/bookings"
                    element={
                        <ProtectedRoute>
                            <DashboardBookings />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/categories"
                    element={
                        <ProtectedRoute>
                            <DashboardCategories />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/customers"
                    element={
                        <ProtectedRoute>
                            <Customers />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/customers/:id"
                    element={
                        <ProtectedRoute>
                            <CustomerDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/users"
                    element={
                        <AdminOnlyRoute>
                            <UserManagement />
                        </AdminOnlyRoute>
                    }
                />
                <Route path="*" element={<NotFound />} />
            </Routes>
            
        </BrowserRouter>
    )
}

