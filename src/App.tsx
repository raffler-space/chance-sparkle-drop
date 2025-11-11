import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Raffles from "./pages/Raffles";
import Auth from "./pages/Auth";
import HowItWorks from "./pages/HowItWorks";
import Referrals from "./pages/Referrals";
import NotFound from "./pages/NotFound";
import { useWeb3 } from "./hooks/useWeb3";

const queryClient = new QueryClient();

const App = () => {
  const { account, isConnecting, connectWallet } = useWeb3();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/raffles" element={<Raffles />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/how-it-works" 
              element={
                <HowItWorks 
                  account={account} 
                  isConnecting={isConnecting} 
                  onConnectWallet={connectWallet} 
                />
              } 
            />
            <Route 
              path="/referrals" 
              element={
                <Referrals 
                  account={account} 
                  isConnecting={isConnecting} 
                  onConnectWallet={connectWallet} 
                />
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
