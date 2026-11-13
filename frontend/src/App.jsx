import { Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import UploadPage from "./pages/UploadPage";
import ExploreDataset from "./pages/ExploreDataset";
import Auth from "./Auth/auth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/explore/:id" element={<ExploreDataset />} />
      <Route path="/dataset/:id" element={<ExploreDataset />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth register />} />
    </Routes>
  );
}

export default App;
