import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import EmployeeChecklist from "./pages/EmployeeChecklist";
import ManagerDashboard from "./pages/ManagerDashboard";
import TemplateEditor from "./pages/TemplateEditor";
import UserManagement from "./pages/UserManagement";
import HowToRegister from "./pages/HowToRegister";
import Analytics from "./pages/Analytics";
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";
import Orders from "./pages/Orders";
import Recipes from "./pages/Recipes";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/checklist"} component={EmployeeChecklist} />
      <Route path={"/dashboard"} component={ManagerDashboard} />
      <Route path={"/templates"} component={TemplateEditor} />
      <Route path={"/users"} component={UserManagement} />
      <Route path={"/how-to-register"} component={HowToRegister} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/tasks"} component={Tasks} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/recipes"} component={Recipes} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.19 0.012 260)",
                border: "1px solid oklch(0.28 0.015 260)",
                color: "oklch(0.9 0.005 260)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
