import { Routes, Route, BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/user-store";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CompareBar } from "@/components/CompareBar";
import { useLocalizationStore } from "@/stores/localization-store";

import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Contact from "@/pages/Contact";
import Account from "@/pages/Account";
import Deals from "@/pages/Deals";
import PCBuilder from "@/pages/PCBuilder";
import Compare from "@/pages/Compare";
import Platinum from "@/pages/Platinum";
import Wishlist from "@/pages/Wishlist";
import Dashboard from "@/pages/Dashboard";
import ManagerPanel from "@/pages/ManagerPanel";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

function AuthInit() {
  const { fetchMe } = useUserStore();
  const { loadRates, detectFromIp } = useLocalizationStore();
  useEffect(() => {
    fetchMe();
    loadRates();
    detectFromIp();
  }, [fetchMe, loadRates, detectFromIp]);
  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/account" element={<Account />} />
      <Route path="/deals" element={<Deals />} />
      <Route path="/build" element={<PCBuilder />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/platinum" element={<Platinum />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/manager" element={<ManagerPanel />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  const handleLoadComplete = () => {
    setLoading(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {loading && <LoadingScreen onComplete={handleLoadComplete} />}
        <BrowserRouter basename={base}>
          <AuthInit />
          <AppRoutes />
          <CompareBar />
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
