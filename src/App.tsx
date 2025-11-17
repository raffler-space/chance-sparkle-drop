import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "./providers/Web3Provider";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Raffles from "./pages/Raffles";
import Auth from "./pages/Auth";
import HowItWorks from "./pages/HowItWorks";
import Referrals from "./pages/Referrals";
import ReferralRedirect from "./pages/ReferralRedirect";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Disclaimer from "./pages/Disclaimer";
import NotFound from "./pages/NotFound";
import { useWeb3 } from "./hooks/useWeb3";

const queryClient = new QueryClient();

const AppContent = () => {
  const { account, isConnecting, connectWallet, disconnectWallet } = useWeb3();

  return (
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
                  onDisconnectWallet={disconnectWallet}
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
                  onDisconnectWallet={disconnectWallet}
                />
              } 
            />
            <Route path="/ref/:code" element={<ReferralRedirect />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
};

export default App;
