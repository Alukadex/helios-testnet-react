import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ViewContext } from "./LayoutClientWrapper";
import { api } from "../services/api";
import { Share2, Users, Copy, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const InviteCodeDisplay = () => {
  const { address } = useAccount();
  const { setCurrentView } = React.useContext(ViewContext);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [referralXP, setReferralXP] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Invite quota state
  const [inviteQuota, setInviteQuota] = useState<{
    canInvite: boolean;
    currentQuota: number;
    usedToday: number;
    remainingInvites: number;
  } | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  // Function to fetch invite quota information
  const fetchInviteQuota = async () => {
    if (!address) return;
    
    try {
      setQuotaLoading(true);
      const quotaResponse = await api.getUserInviteStatus(address);
      if (quotaResponse.success) {
        setInviteQuota({
          canInvite: quotaResponse.data.canInvite,
          currentQuota: quotaResponse.data.currentQuota,
          usedToday: quotaResponse.data.usedToday,
          remainingInvites: quotaResponse.data.remainingInvites,
        });
      }
    } catch (error) {
      console.error("InviteCodeDisplay: Error fetching invite quota:", error);
    } finally {
      setQuotaLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      // If the wallet is not connected yet, we'll just wait. The component will show its
      // default loading state, and this effect will re-run when the address becomes available.
      if (!address) {
        return;
      }

      try {
        setLoading(true);
        setError(null); // Clear previous errors on a new fetch

        // Fetch both profile and referrals in parallel
        const [userProfile, referralsResponse] = await Promise.all([
          api.getUserProfile(address),
          api.getUserReferrals(1, 1),
        ]);

        // Prioritize referral code from the user's profile first
        const code = userProfile?.referralCode || referralsResponse?.referralCode || null;
        setReferralCode(code);

        if (referralsResponse?.success) {
          setReferralCount(referralsResponse.referralCount);
          setReferralXP(referralsResponse.referralXP);
        }

        // After fetching user data, get their invite quota
        await fetchInviteQuota();

      } catch (fetchError) {
        console.error("InviteCodeDisplay: Error fetching data:", fetchError);
        setError("Failed to load user data."); // Set a clear error state on failure
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [address]);

  function formatReferralCount(count: number): string {
    if (count >= 1_000_000)
      return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (count >= 1_000)
      return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return count.toString();
  }

  const handleCopy = () => {
    if (!referralCode) return;

    // Create the full referral URL
    const referralUrl = `https://testnet.helioschain.network/?code=${referralCode}`;

    navigator.clipboard
      .writeText(referralUrl)
      .then(() => {
        setCopied(true);
        console.log("InviteCodeDisplay: Code URL copied", referralUrl);

        // Clear existing timeout if any
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Reset copied state after 2 seconds
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  };

  const handleShareOnX = () => {
    if (!referralCode) return;

    const tweetText = `Join me on Helios Testnet! Use my invite code: ${referralCode} to get started. #Helios #Blockchain #Testnet`;
    const encodedText = encodeURIComponent(tweetText);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;

    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  // Mobile-optimized display
  return (
    <div className="flex gap-2 items-center justify-end">
      {loading ? (
        <div className="bg-white/70 rounded-full py-1 px-3 flex items-center">
          <div className="loading-shimmer h-4 w-20 rounded-md"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50/90 rounded-full py-1 px-3 flex items-center border border-red-200">
          <div className="text-red-500 text-xs">Error</div>
        </div>
      ) : referralCode ? (
        <>
          <button
            onClick={() => setCurrentView("referrals")}
            className="bg-[#002DCB] text-white rounded-full px-4 py-2 flex items-center hover:bg-[#0025B3] transition-colors shadow-sm active:shadow-inner relative"
            title="View Referral Leaderboard"
          >
            <Users className="w-4 h-4 mr-2" />
            <div className="flex flex-col items-start">
              <span className="text-base font-medium whitespace-nowrap">
                {formatReferralCount(referralCount ?? 0)}{" "}
                <span className="xs:inline hide-text">Referrals</span>
              </span>
              {inviteQuota && (
                <span className="text-xs opacity-80 whitespace-nowrap">
                  {inviteQuota.remainingInvites} left today
                </span>
              )}
            </div>
            {inviteQuota && !inviteQuota.canInvite && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" 
                   title="Daily invite limit reached" />
            )}
          </button>

          <div className="bg-white/80 rounded-full px-3 py-2 flex items-center border border-[#002DCB]/10 shadow-sm">
            <div className="text-sm font-medium text-[#002DCB] mr-1.5 hidden sm:block">
              Code:
            </div>
            <div className="text-sm font-bold text-[#060F32] mr-1">
              {referralCode.length > 5
                ? `${referralCode.slice(0, 3)}...${referralCode.slice(-2)}`
                : referralCode}
            </div>
            
            {/* Quota indicator */}
            {inviteQuota && (
              <div className="flex items-center mr-1.5">
                {inviteQuota.canInvite ? (
                  <div className="flex items-center text-green-600" title={`${inviteQuota.remainingInvites} invites remaining today`}>
                    <Clock className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">{inviteQuota.remainingInvites}</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-500" title="Daily invite limit reached">
                    <AlertCircle className="h-3 w-3" />
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={handleCopy}
              className="text-[#002DCB] p-1.5 rounded-full hover:bg-[#E2EBFF] active:bg-[#D7E0FF] transition-colors"
              aria-label="Copy invite code"
              title="Copy to clipboard"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-yellow-50/80 rounded-full py-1 px-3 flex items-center">
          <div className="text-yellow-600 text-xs">No code</div>
        </div>
      )}
    </div>
  );
};

export default InviteCodeDisplay;
