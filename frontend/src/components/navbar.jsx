import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaCarSide, FaChartBar, FaCloudUploadAlt, FaSignOutAlt, FaUserCircle, FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const storedUser = sessionStorage.getItem("exitstingUser") || sessionStorage.getItem("existingUser");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                setUser(null);
            }
        }
    }, [location]);

    const handleLogout = () => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("exitstingUser");
        sessionStorage.removeItem("existingUser");
        navigate("/login");
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Brand */}
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            <FaCarSide className="text-xl" />
                        </div>
                        <div>
                            <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                                Dromolys
                            </span>
                            <span className="hidden sm:inline-block ml-2 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                Traffic Vision
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center gap-2">
                        <Link
                            to="/dashboard"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                isActive("/dashboard")
                                    ? "bg-blue-50 text-blue-700 font-semibold shadow-xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                        >
                            <FaChartBar />
                            Dashboard
                        </Link>
                        <Link
                            to="/upload"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                isActive("/upload")
                                    ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/30"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                        >
                            <FaCloudUploadAlt className="text-base" />
                            Upload File
                        </Link>
                    </div>

                    {/* User Profile & Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                                <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
                                    <FaUserCircle className="text-slate-500 text-lg" />
                                    <span className="text-xs font-medium text-slate-800 max-w-[150px] truncate">
                                        {user.username || user.email}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
                                    title="Sign Out"
                                >
                                    <FaSignOutAlt />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Toggle Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2">
                    <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            isActive("/dashboard") ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <FaChartBar />
                        Dashboard
                    </Link>
                    <Link
                        to="/upload"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            isActive("/upload") ? "bg-blue-600 text-white font-semibold" : "text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <FaCloudUploadAlt />
                        Upload CSV
                    </Link>
                    {user && (
                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                                <FaUserCircle className="text-slate-500 text-base" />
                                <span className="truncate max-w-[200px]">{user.username || user.email}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1 text-xs text-rose-600 font-medium hover:underline"
                            >
                                <FaSignOutAlt />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}
