import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { MyBooking } from "./pages/MyBooking";
import { Admin } from "./pages/Admin";
import { AdminLogin } from "./pages/AdminLogin";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/my-booking" element={<MyBooking />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
