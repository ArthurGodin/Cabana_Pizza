import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MenuProvider } from "@/contexts/menu-context";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import OrderTrackingPage from "./pages/OrderTracking.tsx";

const queryClient = new QueryClient();
const AdminPage = lazy(() => import("./pages/Admin.tsx"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#120d0b] px-4 text-sm text-muted-foreground">
      Carregando...
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MenuProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pedido/:publicId" element={<OrderTrackingPage />} />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AdminPage />
                </Suspense>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </MenuProvider>
  </QueryClientProvider>
);

export default App;
