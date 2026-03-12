// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import POS from "./pages/POS";
import ProductManagement from "./pages/ProductManagement";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import InventoryManagement from "./pages/InventoryManagement";
import AuditLogs from "./pages/AuditLogs";

function App() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const routerBase = baseUrl === "/" ? undefined : baseUrl.replace(/\/$/, "");

  return (
    <BrowserRouter basename={routerBase}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          element={(
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          )}
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route
            path="/product-management"
            element={(
              <RoleProtectedRoute allowedRoles={["Admin"]}>
                <ProductManagement />
              </RoleProtectedRoute>
            )}
          />
          <Route
            path="/inventory-management"
            element={(
              <RoleProtectedRoute allowedRoles={["Admin"]}>
                <InventoryManagement />
              </RoleProtectedRoute>
            )}
          />
          <Route
            path="/reports"
            element={(
              <RoleProtectedRoute allowedRoles={["Admin"]}>
                <Reports />
              </RoleProtectedRoute>
            )}
          />
          <Route
            path="/audit-logs"
            element={(
              <RoleProtectedRoute allowedRoles={["Admin"]}>
                <AuditLogs />
              </RoleProtectedRoute>
            )}
          />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
