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
import AppAccessRoute from "./components/auth/AppAccessRoute";
import ModuleAccessRoute from "./components/auth/ModuleAccessRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import AccessControl from "./pages/AccessControl";
import AppChooser from "./pages/AppChooser";
import CrmAttendance from "./pages/CrmAttendance";
import CrmActivities from "./pages/CrmActivities";
import CrmCustomers from "./pages/CrmCustomers";
import CrmLeads from "./pages/CrmLeads";
import CrmOcr from "./pages/CrmOcr";
import Dashboard from "./pages/Dashboard";
import CrmWorkspace from "./pages/CrmWorkspace";
import Login from "./pages/Login";
import POS from "./pages/POS";
import ProductManagement from "./pages/ProductManagement";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import InventoryManagement from "./pages/InventoryManagement";
import AuditLogs from "./pages/AuditLogs";
import HelpGuide from "./pages/HelpGuide";
import { CRM_APP, POS_APP } from "./services/authSession";

function App() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const routerBase = baseUrl === "/" ? undefined : baseUrl.replace(/\/$/, "");

  return (
    <BrowserRouter basename={routerBase}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/choose-app"
          element={(
            <ProtectedRoute>
              <AppChooser />
            </ProtectedRoute>
          )}
        />
        <Route
          element={(
            <AppAccessRoute app={POS_APP}>
              <MainLayout app={POS_APP} />
            </AppAccessRoute>
          )}
        >
          <Route
            path="/dashboard"
            element={(
              <ModuleAccessRoute app={POS_APP} module="dashboard">
                <Dashboard />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/pos"
            element={(
              <ModuleAccessRoute app={POS_APP} module="pos">
                <POS />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/product-management"
            element={(
              <ModuleAccessRoute app={POS_APP} module="product-management">
                <RoleProtectedRoute allowedRoles={["Admin"]}>
                  <ProductManagement />
                </RoleProtectedRoute>
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/inventory-management"
            element={(
              <ModuleAccessRoute app={POS_APP} module="inventory-management">
                <RoleProtectedRoute allowedRoles={["Admin"]}>
                  <InventoryManagement />
                </RoleProtectedRoute>
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/reports"
            element={(
              <ModuleAccessRoute app={POS_APP} module="reports">
                <RoleProtectedRoute allowedRoles={["Admin"]}>
                  <Reports />
                </RoleProtectedRoute>
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/audit-logs"
            element={(
              <ModuleAccessRoute app={POS_APP} module="audit-logs">
                <RoleProtectedRoute allowedRoles={["Admin"]}>
                  <AuditLogs />
                </RoleProtectedRoute>
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/help"
            element={(
              <ModuleAccessRoute app={POS_APP} module="help">
                <HelpGuide />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/settings"
            element={(
              <ModuleAccessRoute app={POS_APP} module="settings">
                <Settings />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/access-control"
            element={(
              <ModuleAccessRoute app={POS_APP} module="access-control">
                <RoleProtectedRoute allowedRoles={["Admin"]}>
                  <AccessControl />
                </RoleProtectedRoute>
              </ModuleAccessRoute>
            )}
          />
        </Route>
        <Route
          element={(
            <AppAccessRoute app={CRM_APP}>
              <MainLayout app={CRM_APP} />
            </AppAccessRoute>
          )}
        >
          <Route
            path="/crm"
            element={(
              <ModuleAccessRoute app={CRM_APP} module="crm">
                <CrmWorkspace />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/crm/customers"
            element={(
              <ModuleAccessRoute app={CRM_APP} module="crm-customers">
                <CrmCustomers />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/crm/attendance"
            element={(
              <ModuleAccessRoute app={CRM_APP} module="crm-attendance">
                <CrmAttendance />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/crm/ocr"
            element={(
              <ModuleAccessRoute app={CRM_APP} module="crm-ocr">
                <CrmOcr />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/crm/leads"
            element={(
              <ModuleAccessRoute app={CRM_APP} module="crm-leads">
                <CrmLeads />
              </ModuleAccessRoute>
            )}
          />
          <Route
            path="/crm/activities"
            element={(
              <ModuleAccessRoute app={CRM_APP} module="crm-activities">
                <CrmActivities />
              </ModuleAccessRoute>
            )}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
