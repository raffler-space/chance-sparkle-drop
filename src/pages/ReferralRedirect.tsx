import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      // Store referral code in localStorage
      localStorage.setItem('referralCode', code);
      
      // Redirect to auth page
      navigate('/auth');
    } else {
      // If no code, redirect to home
      navigate('/');
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-foreground">Processing referral...</p>
      </div>
    </div>
  );
}
