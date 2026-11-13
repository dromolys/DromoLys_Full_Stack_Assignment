import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
    const token = sessionStorage.getItem("token");

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="flex flex-col gap-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider w-fit">
                            Intelligent Traffic Intelligence
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            Vehicle Observation <span className="text-blue-600">Data Platform</span>
                        </h1>
                        <p className="text-slate-600 text-lg leading-relaxed">
                            An intelligent platform for uploading, validating, and analyzing vehicle observation data. Explore traffic patterns, inspect vehicle classifications, and inspect coordinates with atomic CSV validation.
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                            {token ? (
                                <Link
                                    to="/dashboard"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105"
                                    >
                                        Get Started
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="bg-white hover:bg-slate-100 text-slate-800 font-bold px-6 py-3 rounded-xl border border-slate-300 transition-colors"
                                    >
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="relative">
                        <img
                            className="w-full h-auto max-h-[500px] object-cover rounded-2xl shadow-xl border border-slate-200"
                            src="/internet-things-iot-smart-connection-control-device-network-industry-resident-anywhere-anytime-anybody-any-business-with-internet-it-technology-futuristic-world_1150-61164.avif"
                            alt="Vehicle Observation Platform"
                            onError={(e) => {
                                e.target.style.display = "none";
                            }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
