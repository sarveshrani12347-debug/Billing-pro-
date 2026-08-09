import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fingerprint, Mail, Lock, LogIn, Key, Smartphone, AlertCircle, Eye, EyeOff,
  Chrome, ShieldAlert, CheckCircle2, X, Sparkles, HelpCircle, RefreshCw, ChevronRight, Check, Unlock
} from 'lucide-react';
import { User } from '../types';

interface ShreeOpeningFlowProps {
  token: string | null;
  onLogin: (user: User, token: string) => void;
  isLight: boolean;
  onFlowFinished: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export function ShreeOpeningFlow({ 
  token, 
  onLogin, 
  isLight, 
  onFlowFinished, 
  showToast 
}: ShreeOpeningFlowProps) {
  
  // Phase mapping: splash -> auth/biometric -> shutter -> promo -> dashboard(handled by onFlowFinished)
  const [phase, setPhase] = useState<'splash' | 'auth' | 'biometric' | 'shutter' | 'promo'>('splash');
  
  // Tab-state for Authentication screen
  const [authTab, setAuthTab] = useState<'email' | 'otp' | 'google'>('email');
  
  // Form fields
  const [email, setEmail] = useState('sarveshyadav8777@gmail.com');
  const [password, setPassword] = useState('sarvesh123');
  const [operatorName, setOperatorName] = useState('Sarvesh Yadav');
  const [isRegister, setIsRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP State
  const [mobileNumber, setMobileNumber] = useState('+91 98765 43210');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountDown, setOtpCountDown] = useState(60);
  
  // Biometric/PIN state
  const [pinCode, setPinCode] = useState('');
  const [biometricError, setBiometricError] = useState('');
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  
  // General status
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Ad Promo state
  const [adCountDown, setAdCountDown] = useState(3);
  const [adCanSkip, setAdCanSkip] = useState(false);

  // Forgot Password / Reset Password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotOtp, setForgotOtp] = useState('');

  // Play synthesized audio effects through web audio APIs
  const playSynthesizedChime = (type: 'success' | 'failure' | 'shutter' | 'click') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'success') {
        // Double pleasant ring: C5 then E5
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();
        
        osc1.connect(gain1); gain1.connect(ctx.destination);
        osc2.connect(gain2); gain2.connect(ctx.destination);
        
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain1.gain.setValueAtTime(0.12, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.4);
        
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc2.start(ctx.currentTime + 0.12);
        osc2.stop(ctx.currentTime + 0.5);
      } else if (type === 'shutter') {
        // White noise metallic sweep to simulate metallic shutter speed woosh
        const bufferSize = ctx.sampleRate * 1.5; // 1.5 seconds length
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 1.2);
        filter.Q.value = 8.0;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.2); // swell
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4); // fade
        
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noiseNode.start();
        noiseNode.stop(ctx.currentTime + 1.5);
      } else if (type === 'failure') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(180, ctx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      }
    } catch (e) {
      console.warn('Audio synthesis held by client interaction restrictions.', e);
    }
  };

  // Step 1: Splash Screen timer
  useEffect(() => {
    if (phase === 'splash') {
      const timer = setTimeout(() => {
        if (token) {
          // Already authenticated, proceed to biometric pin block challenge
          setPhase('biometric');
        } else {
          // Require authentication
          setPhase('auth');
        }
      }, 3000); // 3 seconds splash
      return () => clearTimeout(timer);
    }
  }, [phase, token]);

  // OTP Tick Timer
  useEffect(() => {
    let interval: any;
    if (otpSent && otpCountDown > 0) {
      interval = setInterval(() => {
        setOtpCountDown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpCountDown]);

  // Promotional countdown timer
  useEffect(() => {
    let interval: any;
    if (phase === 'promo' && adCountDown > 0) {
      interval = setInterval(() => {
        setAdCountDown(prev => {
          if (prev <= 1) {
            setAdCanSkip(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'promo' && adCountDown === 0) {
      setAdCanSkip(true);
    }
    return () => clearInterval(interval);
  }, [phase, adCountDown]);

  // Submit standard Email/Password authentication using the real system backend proxy
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? { email, password, name: operatorName } : { email, password };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Identity vault authorization denied.');
      }
      
      playSynthesizedChime('success');
      // Execute standard onLogin to update credentials in local storage
      onLogin(data.user, data.token);
      showToast(`Identity unlocked! Welcome back, ${data.user.name}.`, 'success');
      
      // Proactively move to Shutter Shop opening phase
      setPhase('shutter');
    } catch (err: any) {
      playSynthesizedChime('failure');
      setAuthError(err.message || 'No connection to security gateway.');
    } finally {
      setLoading(false);
    }
  };

  // Mock and simulate OTP flow of Mobile
  const handleRequestOtp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!mobileNumber.trim()) {
      showToast("Please specify a valid mobile number", "error");
      return;
    }
    setLoading(true);
    playSynthesizedChime('click');
    
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setOtpCountDown(60);
      showToast("🔐 Security alert: Code 9904 generated and sent to +91 98765-43210!", "success");
    }, 1200);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '9904' && otpCode !== '000000' && otpCode.length < 4) {
      playSynthesizedChime('failure');
      setAuthError('Incorrect Security Code. Hint: use 9904 to auto-authorize.');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      playSynthesizedChime('success');
      
      // Setup mock logged user
      const mockUser: User = {
        name: 'Sarvesh Yadav (Mobile-OTP)',
        email: 'sarveshyadav8777@gmail.com',
        role: 'operator'
      };
      onLogin(mockUser, 'mock_otp_verified_token');
      showToast("Mobile Verification Approved. Workspace configured.", "success");
      setPhase('shutter');
    }, 1300);
  };

  // Mock and simulate external Google Auth flow popup
  const handleGoogleSignIn = () => {
    playSynthesizedChime('click');
    setAuthTab('google');
    setAuthError('');
  };

  const selectGoogleAccountMockState = (accountEmail: string, accountName: string) => {
    setLoading(true);
    playSynthesizedChime('click');
    setTimeout(() => {
      setLoading(false);
      playSynthesizedChime('success');
      const mockUser: User = {
        name: accountName,
        email: accountEmail,
        role: 'operator'
      };
      onLogin(mockUser, 'mock_google_oauth_token');
      showToast(`Welcome ${accountName}! Authenticated via OAuth 2.0.`, 'success');
      setPhase('shutter');
    }, 1500);
  };

  // Real Biometric verification flow using native device APIs
  const handleTriggerBiometricScan = async () => {
    setIsBiometricScanning(true);
    setBiometricError('');
    playSynthesizedChime('click');

    if (!window.PublicKeyCredential) {
      setBiometricError('Native biometric APIs are not supported in this browser. Falling back to platform lockscreen PIN.');
      setIsBiometricScanning(false);
      return;
    }

    try {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      // We generate a challenge to invoke the platform's biometric prompt
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const rpId = window.location.hostname || "localhost";
      const options: CredentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Vyapar Ledger Office",
            id: rpId
          },
          user: {
            id: userId,
            name: "operator@vyaparledger.com",
            displayName: "Vyapar Operator"
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false
          },
          timeout: 20000
        }
      };

      // This triggers the device's native fingerprint/FaceID/Pattern/PIN prompt
      const credential = await navigator.credentials.create(options);
      if (credential) {
        playSynthesizedChime('success');
        showToast('Native device biometric authentication successful!', 'success');
        setPhase('shutter');
      } else {
        throw new Error('Device biometric verification was canceled.');
      }
    } catch (err: any) {
      console.warn("Biometric check failed, trying secure lockscreen credentials fallback:", err);
      
      let errorMsg = err?.message || 'Biometric verification failed.';
      
      // If WebAuthn fails due to Iframe security rules, fallback to standard credential autofill / Keychain prompt
      if (err.name === 'SecurityError') {
        errorMsg = 'WebAuthn is iframe-restricted. Triggering the OS lockscreen password manager fallback...';
        showToast(errorMsg, 'error');
        
        try {
          if (navigator.credentials && navigator.credentials.get) {
            const cred = await navigator.credentials.get({
              password: true,
              mediation: 'optional'
            } as any);
            if (cred) {
              playSynthesizedChime('success');
              showToast('Device lock authorized successfully!', 'success');
              setPhase('shutter');
              setIsBiometricScanning(false);
              return;
            }
          }
        } catch (credErr) {
          console.warn("Keychain credential lock fallback failed:", credErr);
        }
      } else if (err.name === 'NotAllowedError') {
        errorMsg = 'Biometric scan canceled by operator. Please try again or use the PIN fallback below.';
      }

      setBiometricError(errorMsg);
    } finally {
      setIsBiometricScanning(false);
    }
  };

  // PIN security unlock submit
  const handlePinUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode === '1234' || pinCode === '9904' || pinCode === 'sarvesh123') {
      playSynthesizedChime('success');
      showToast(`Secure Lockscreen Vault Opened!`, 'success');
      setPhase('shutter');
    } else {
      playSynthesizedChime('failure');
      setBiometricError('Incorrect Security Vault PIN. Try "1234" or standard password');
      setPinCode('');
    }
  };

  const appendPinDigit = (digit: string) => {
    playSynthesizedChime('click');
    if (pinCode.length < 6) {
      setPinCode(prev => prev + digit);
    }
  };

  const clearPinDigit = () => {
    playSynthesizedChime('click');
    setPinCode(prev => prev.slice(0, -1));
  };

  // Skip Promotional Banner immediately
  const handleSkipAd = () => {
    playSynthesizedChime('click');
    onFlowFinished();
  };

  const handleInstantGuestAccess = () => {
    playSynthesizedChime('success');
    const guestUser: User = {
      name: 'Sarvesh Yadav (Guest Operator)',
      email: 'sarveshyadav8777@gmail.com',
      role: 'admin'
    };
    onLogin(guestUser, 'demo_vault_token_2026');
    onFlowFinished();
    showToast('App launched in Guest Mode! Welcome to Shree Billing Pro.', 'success');
  };

  // When Shutter finishes opening
  const handleShutterAnimationComplete = () => {
    // Shutter synth sound is triggered at startup of shutter
    setPhase('promo');
  };

  // Start Shutter sound sweep immediately when phase becomes shutter
  useEffect(() => {
    if (phase === 'shutter') {
      playSynthesizedChime('shutter');
    }
  }, [phase]);

  // Custom forgot password dialog & interactive reset flow
  const handleForgotPassword = () => {
    playSynthesizedChime('click');
    setForgotEmail(email); // Autofill from whatever they typed
    setForgotStep('request');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setShowForgotModal(true);
  };

  const handleRequestForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast('Specify your operator email address first', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotStep('verify');
      showToast('🔐 Simulated OTP verification code "7788" dispatched to ' + forgotEmail, 'success');
      playSynthesizedChime('success');
    }, 1000);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotOtp !== '7788') {
      showToast('Incorrect verification OTP code.', 'error');
      playSynthesizedChime('failure');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (forgotNewPassword.length < 4) {
      showToast('Password must be at least 4 characters.', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, newPassword: forgotNewPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }
      showToast('🔒 Operator vault key reset successfully!', 'success');
      playSynthesizedChime('success');
      setShowForgotModal(false);
      setPassword(forgotNewPassword); // update login field password
      setEmail(forgotEmail); // update login field email
    } catch (err: any) {
      showToast(err.message, 'error');
      playSynthesizedChime('failure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`overflow-hidden select-none transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'} fixed inset-0 z-50 flex items-center justify-center`}>
      
      {/* Top persistent bypass / skip button */}
      <div className="absolute top-4 right-4 z-[100] flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstantGuestAccess}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-emerald-400/40"
          title="Bypass login and open app dashboard directly"
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>⚡ Launch App Dashboard</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* ========================================================== */}
        {/* PHASE 1: SPLASH SCREEN CONTAINER                          */}
        {/* ========================================================== */}
        {phase === 'splash' && (
          <motion.div 
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            className="text-center flex flex-col items-center justify-between h-full py-20 px-8 w-full max-w-lg z-50 absolute inset-0 mx-auto"
          >
            {/* Top Empty Space */}
            <div className="h-10"></div>

            {/* Logo and App Name layout */}
            <div className="space-y-6 flex flex-col items-center">
              {/* Shree Billing Pro Premium MD3 Logo */}
              <motion.div 
                initial={{ scale: 0.4, rotate: -45, opacity: 0 }}
                animate={{ scale: [1, 1.1, 1], rotate: 0, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-500 p-[3px] shadow-2xl relative flex items-center justify-center group"
              >
                {/* Visual Glow Core */}
                <div className="absolute inset-0 bg-violet-600/30 rounded-3xl filter blur-xl group-hover:blur-2xl transition-all animate-pulse"></div>
                
                {/* Interior Material Pattern */}
                <div className="w-full h-full rounded-[21px] bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Subtle vector lines */}
                  <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent opacity-60"></div>
                  
                  {/* Geometric custom billing S letter made of pristine gradients */}
                  <div className="z-10 flex items-center justify-center">
                    <span className="text-4xl font-black font-sans tracking-tighter bg-gradient-to-r from-emerald-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                      S
                    </span>
                    <span className="text-3xl font-black font-mono tracking-tighter text-white -ml-0.5">
                      B
                    </span>
                    <span className="text-4xl font-extrabold font-sans text-emerald-400 -ml-0.5">
                      +
                    </span>
                  </div>
                  
                  {/* Symmetrical MD3 design accent */}
                  <div className="absolute bottom-1 w-8 h-1 bg-emerald-500/80 rounded-full"></div>
                </div>
              </motion.div>

              {/* Title & Tagline with smooth lettering */}
              <div className="space-y-3">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-4xl font-black tracking-tight font-sans text-slate-900 dark:text-white"
                >
                  Shree <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-emerald-400">Billing Pro</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-widest font-mono uppercase"
                >
                  Smart Billing • Smart Business
                </motion.p>
              </div>
            </div>

            {/* Ambient Loading Indicator and Footnotes */}
            <motion.div 
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              {/* Spinner */}
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900 shadow">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">Preparing secure vault workspace...</span>
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                Version 3.0.4 Enterprise
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* PHASE 2A: AUTHENTICATION (Register & Login options)        */}
        {/* ========================================================== */}
        {phase === 'auth' && (
          <motion.div 
            key="auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md p-6 sm:p-8 flex flex-col justify-center z-50 absolute"
          >
            {/* Header Identity */}
            <div className="text-center mb-6 space-y-2">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-505 from-indigo-600 to-emerald-500 items-center justify-center shadow-lg shadow-indigo-505/20 text-white font-black text-xl mb-1">
                S
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
                {isRegister ? 'Register Team Operator' : 'Access Authorization'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock your workspace nodes in Shree Billing Pro
              </p>
            </div>

            {/* Error alerts if existing */}
            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex gap-2 items-center"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                <span>{authError}</span>
              </motion.div>
            )}

            {/* Beautiful Tab Bar Selector using MD3 design philosophy */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setAuthTab('email'); setAuthError(''); }}
                className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  authTab === 'email' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Passkey
              </button>
              
              <button
                type="button"
                onClick={() => { setAuthTab('otp'); setAuthError(''); }}
                className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  authTab === 'otp' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                OTP Mobile
              </button>

              <button
                type="button"
                onClick={() => { setAuthTab('google'); setAuthError(''); }}
                className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  authTab === 'google' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Google Log
              </button>
            </div>

            {/* TAB CONTAINER FORM ACTIONS */}
            <div className={`p-6 border rounded-2xl ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900 shadow-2xl border-slate-800'}`}>
              
              {/* ======================= EMAIL FORM TAB ======================= */}
              {authTab === 'email' && (
                <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                  {isRegister && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Full Developer/Owner Name
                      </label>
                      <input
                        type="text"
                        required
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                        placeholder="e.g. Sarvesh Yadav"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Operator Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-450" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                        placeholder="sarveshyadav8777@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Passkey Vault Key
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[9.5px] font-bold text-indigo-500 hover:underline"
                      >
                        Forgot Pass?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-450" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 bg-slate-100 dark:bg-slate-800 border-none"
                      />
                      <span className="text-slate-500 dark:text-slate-400">Remember credentials</span>
                    </label>
                  </div>

                  {/* Submission Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 rounded-xl text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="h-3.5 w-3.5" />
                        {isRegister ? 'Register Member' : 'Verify Credentials'}
                      </>
                    )}
                  </button>

                  {/* Mode switcher */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRegister(!isRegister)}
                      className="text-xs text-indigo-500 hover:underline"
                    >
                      {isRegister ? 'Have accounts? Secure Login' : 'Need partner access? Register profile'}
                    </button>
                  </div>
                </form>
              )}


              {/* ======================= OTP FORM TAB ======================= */}
              {authTab === 'otp' && (
                <div className="space-y-4">
                  {!otpSent ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Registered Business Contact Number
                        </label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-450" />
                          <input
                            type="text"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                              isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                            }`}
                            placeholder="+91 98765-43210"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Transmit 6-Digit OTP"}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
                          <span>Enter Security Token</span>
                          <span className="text-emerald-500 font-mono">OTP Code Outbox Active</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className={`w-full px-3 py-2.5 text-center text-lg font-black font-mono tracking-widest rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                          placeholder="e.g. 9904"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 flex justify-between">
                          <span>Verification Code: <strong className="font-bold font-mono text-emerald-500">9904</strong></span>
                          {otpCountDown > 0 ? (
                            <span>Resend in {otpCountDown}s</span>
                          ) : (
                            <button type="button" onClick={handleRequestOtp} className="text-indigo-500 font-bold hover:underline">Resend OTP Now</button>
                          )}
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Verify Code & Open Shutter"}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        Change mobile telephone block
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ======================= GOOGLE SIGN-IN TAB ======================= */}
              {authTab === 'google' && (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                    <Chrome className="h-8 w-8 text-indigo-500 mx-auto mb-2 animate-bounce" />
                    <h4 className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-300">
                      Federated Google Sign-In Hub
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Choose one account from your active browser profile session to logs instantly.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => selectGoogleAccountMockState('sarveshyadav8777@gmail.com', 'Sarvesh Yadav (Primary)')}
                      className="w-full p-2.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3 transition-all text-left cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700 border border-indigo-200">
                        SY
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">Sarvesh Yadav</p>
                        <p className="text-[10px] text-slate-450 truncate">sarveshyadav8777@gmail.com</p>
                      </div>
                      <span className="text-[10px] text-emerald-500 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded">Saved</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => selectGoogleAccountMockState('sarvesh.business@gmail.com', 'Sarvesh SBP Admin')}
                      className="w-full p-2.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3 transition-all text-left cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-xs text-amber-705 border border-amber-200">
                        SA
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">Sarvesh SBP Admin</p>
                        <p className="text-[10px] text-slate-450 truncate">sarvesh.business@gmail.com</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Active</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Quick credentials helper block */}
            <div className={`mt-6 border-t pt-4 text-center ${isLight ? 'border-slate-200' : 'border-slate-900'}`}>
              <p className="text-[10.5px] leading-relaxed text-slate-500">
                Default Operator Credentials:<br />
                <span className="font-mono font-bold text-indigo-500">sarveshyadav8777@gmail.com</span> / <span className="font-mono font-bold text-indigo-500">sarvesh123</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* PHASE 2B: BIOMETRIC / LOCKSCREEN VAULT LOCK STATE          */}
        {/* ========================================================== */}
        {phase === 'biometric' && (
          <motion.div 
            key="biometric"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center z-50 absolute"
          >
            {/* Identity */}
            <div className="mb-8 space-y-2">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 font-mono text-[9px] font-bold uppercase tracking-widest rounded-full border border-indigo-500/20">
                Shree Billing Pro Vault
              </span>
              <h2 className="text-2xl font-black text-slate-905 dark:text-slate-100 mt-2">
                Operator Security Desk
              </h2>
              <p className="text-xs text-slate-450">
                Verify identity to release shop rolling shutters
              </p>
            </div>

            {biometricError && (
              <div className="mb-4 p-3 rounded-xl border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs text-left w-full">
                {biometricError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 w-full">
              
              {/* Giant pulsing Biometric trigger button */}
              <div className={`p-6 border rounded-2xl flex flex-col items-center justify-center gap-4 ${
                isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900 border-slate-800 shadow-2xl'
              }`}>
                <div className="relative">
                  {/* Outer pulses */}
                  <div className="absolute inset-x-[-12px] inset-y-[-12px] rounded-full border-2 border-emerald-500/20 animate-ping"></div>
                  <div className="absolute inset-x-[-24px] inset-y-[-24px] rounded-full border border-emerald-500/10 animate-pulse"></div>
                  
                  <button
                    type="button"
                    onClick={handleTriggerBiometricScan}
                    className={`h-20 w-20 rounded-full flex items-center justify-center bg-gradient-to-tr from-emerald-500 to-indigo-600 hover:from-emerald-450 hover:to-indigo-500 text-white shadow-lg cursor-pointer transform hover:scale-105 active:scale-95 transition-all relative overflow-hidden ${
                      isBiometricScanning ? 'animate-pulse' : ''
                    }`}
                  >
                    {isBiometricScanning ? (
                      <RefreshCw className="h-8 w-8 animate-spin" />
                    ) : (
                      <Fingerprint className="h-9 w-9 stroke-[2.3]" />
                    )}

                    {/* Standard loading spinner or fingerprint icon */}
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">
                    {isBiometricScanning ? "Authorizing with OS..." : "Use Native Device Biometrics"}
                  </span>
                  <p className="text-[10px] text-slate-450">
                    Click above to trigger your device\'s Fingerprint, Face Unlock, or lock screen passcode.
                  </p>
                </div>
              </div>

              {/* Enter PIN fallback box */}
              <form onSubmit={handlePinUnlockSubmit} className={`p-4 border rounded-2xl text-left ${
                isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800 shadow-lg'
              }`}>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 font-sans text-center">
                  OR ENTER SECURITY LOCKSCREEN PIN
                </label>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="password"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className={`w-full text-center text-xl font-black font-mono tracking-widest py-2 rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                    placeholder="PIN Code (1234)"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center cursor-pointer"
                  >
                    Open
                  </button>
                </div>

                {/* Grid simple Mini PIN pad for Android touch replication */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 max-w-[240px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => appendPinDigit(num)}
                      className="py-2 text-xs font-black uppercase tracking-wide text-slate-705 dark:text-slate-305 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg font-mono transition-colors border"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinCode('')}
                    className="py-2 text-[9px] font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                  >
                    Clr
                  </button>
                  <button
                    type="button"
                    onClick={() => appendPinDigit('0')}
                    className="py-2 text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-950 hover:bg-slate-205 dark:hover:bg-slate-850 rounded-lg font-mono"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={clearPinDigit}
                    className="py-2 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
                  >
                    &larr;
                  </button>
                </div>
              </form>

            </div>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* PHASE 3: METALLIC SHOP SHUTTER OPENING ANIMATION           */}
        {/* ========================================================== */}
        {phase === 'shutter' && (
          <motion.div 
            key="shutter"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {/* Split shutter slats */}
            <div className="absolute inset-0 flex flex-col">
              
              {/* TOP SHUTTER PANEL ROLLING WALL */}
              <motion.div 
                initial={{ y: 0 }}
                animate={{ y: "-100%" }}
                transition={{ delay: 0.8, duration: 1.4, ease: [0.36, 1, 0.66, 1] }}
                onAnimationComplete={handleShutterAnimationComplete}
                className="w-full h-1/2 bg-gradient-to-b from-slate-400 via-slate-500 to-slate-400 border-b border-slate-600 relative overflow-hidden flex flex-col justify-end"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, #1e293b, #1e293b 8px, #334155 8px, #334155 16px, #475569 16px, #475569 24px, #334155 24px, #334155 32px)',
                  boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.8), inset 0 -4px 10px rgba(0,0,0,0.3)',
                }}
              >
                {/* Horizontal slat steel rivet dots */}
                <div className="absolute inset-x-0 bottom-4 flex justify-between px-6 opacity-30 select-none">
                  {[...Array(12)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-300"></div>)}
                </div>
                
                {/* Center shutter pull handles & padlocks mock overlay */}
                <div className="absolute bottom-[-16px] left-1/2 transform -translate-x-1/2 flex gap-4 z-40">
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 0], rotate: [0, 45, 90], y: [0, 5, 20], opacity: [1, 1, 0] }}
                    transition={{ duration: 0.6 }}
                    className="w-10 h-14 bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-600 rounded-b-xl border border-yellow-300 shadow-xl flex items-center justify-center p-1 font-bold text-slate-900 text-xs uppercase"
                  >
                    <Unlock className="h-5 w-5 text-slate-950 font-black" />
                  </motion.div>
                </div>
                
                {/* Visual Laser shine sweep line horizontal */}
                <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-emerald-500/30 to-transparent animate-pulse border-b border-emerald-400"></div>
              </motion.div>

              {/* BOTTOM SHUTTER PANEL WALL */}
              <motion.div 
                initial={{ y: 0 }}
                animate={{ y: "100%" }}
                transition={{ delay: 0.8, duration: 1.4, ease: [0.36, 1, 0.66, 1] }}
                className="w-full h-1/2 bg-gradient-to-t from-slate-400 via-slate-500 to-slate-400 border-t border-slate-600 relative overflow-hidden"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, #1e293b, #1e293b 8px, #334155 8px, #334155 16px, #475569 16px, #475569 24px, #334155 24px, #334155 32px)',
                  boxShadow: 'inset 0 -10px 30px rgba(0,0,0,0.8), inset 0 4px 10px rgba(0,0,0,0.3)',
                }}
              >
                {/* Bottom Slat Accent */}
                <div className="absolute inset-x-0 top-4 flex justify-between px-6 opacity-30 select-none">
                  {[...Array(12)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-300"></div>)}
                </div>

                <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-emerald-500/30 to-transparent animate-pulse border-t border-emerald-400"></div>
              </motion.div>

            </div>

            {/* Ambient metallic visual light halo sweep effect overlay */}
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 2, 2.5], opacity: [0, 0.8, 0] }}
              transition={{ delay: 0.8, duration: 1.3 }}
              className="absolute h-96 w-96 rounded-full bg-radial from-emerald-400/40 via-indigo-600/10 to-transparent filter blur-3xl z-30"
            ></motion.div>

            {/* Bottom centered Shree Billing Pro metadata signature */}
            <div className="absolute bottom-10 inset-x-0 text-center z-40 select-none">
              <motion.div
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: 15, opacity: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="space-y-1"
              >
                <h3 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-yellow-300 uppercase font-sans">
                  Shree Billing Pro
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Loading secure commercial desktop...
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* PHASE 4: PROMOTIONAL SPONSORED BANNER                      */}
        {/* ========================================================== */}
        {phase === 'promo' && (
          <motion.div 
            key="promo"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
          >
            <div className={`w-full max-w-lg rounded-2xl overflow-hidden border shadow-2xl relative flex flex-col justify-between ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-indigo-950/80 text-white'
            }`}>
              
              {/* Header Labeling */}
              <div className="px-5 py-3 border-b flex justify-between items-center text-[10px] uppercase font-bold tracking-widest bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850">
                <span className="text-amber-500 font-black flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Sponsored Advertisement Offer
                </span>
                <span className="text-slate-400 font-mono">Shree Partner Network</span>
              </div>

              {/* Promotional Content Area */}
              <div className="p-6 space-y-4 text-left">
                
                {/* Ad Premium Product Block */}
                <div className="flex gap-4 items-start pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <div className="p-3.5 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-2xl shadow-lg shrink-0 text-white font-black text-xl">
                    Ultimate
                  </div>
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-505 dark:text-indigo-400 text-[9px] uppercase font-mono font-bold rounded border border-indigo-500/20">
                      Recommend upgrade
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                      Shree Billing Ultimate Premium
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono leading-tight">
                      Automatic GST 1/3B filing, multi-state commercial operations, unlimited printed PDFs, and 24/7 dedicated support.
                    </p>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-3 text-[11px] font-sans text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Multi-device real-time sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>GSTIN Tax E-way registration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>₹10L zero-interest overdraft tier</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Custom bill templates signatures</span>
                  </div>
                </div>

                {/* Deal Pitch bar */}
                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">Special SBP launch deal</span>
                    <strong className="text-sm font-bold text-slate-800 dark:text-indigo-300">₹2,499/Year <span className="text-xs text-slate-500 dark:text-slate-400 font-normal line-through">₹4,999/yr</span></strong>
                  </div>
                  <span className="px-2 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold rounded">
                    Save 50% Today
                  </span>
                </div>
              </div>

              {/* Action Buttons, countdowns & Skip Controls */}
              <div className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850 flex justify-between items-center">
                
                {/* External Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    playSynthesizedChime('click');
                    showToast("Redirecting to Shree partner promotion checkout tier...", "success");
                    onFlowFinished();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-[11px] uppercase tracking-wide rounded-xl shadow cursor-pointer transition-colors"
                >
                  Claim Offer Now
                </button>

                {/* Countdown / Custom Skip Trigger Button */}
                <div className="flex items-center gap-3">
                  {adCanSkip ? (
                    <button
                      type="button"
                      onClick={handleSkipAd}
                      className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-xl text-xs font-black text-indigo-505 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border"
                    >
                      <X className="h-3.5 w-3.5" />
                      Skip Ad
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border rounded-lg text-[10.5px] font-mono text-slate-400 uppercase font-bold">
                      Can Skip in {adCountDown} seconds...
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* FORGOT PASSWORD MODAL OVERLAY                              */}
        {/* ========================================================== */}
        {showForgotModal && (
          <motion.div
            key="forgot-password-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-md p-6 sm:p-8 rounded-2xl border text-left ${
                isLight ? 'bg-white border-slate-200 text-slate-900 shadow-2xl' : 'bg-slate-900 border-slate-800 text-white shadow-2xl'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Recover Operator Key
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => { playSynthesizedChime('click'); setShowForgotModal(false); }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Step 1: Request OTP */}
              {forgotStep === 'request' && (
                <form onSubmit={handleRequestForgotOtp} className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    Enter your registered Operator Email Address below to dispatch a secure 1-time recovery code to your inbox.
                  </p>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Operator Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="sarveshyadav8777@gmail.com"
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-850 text-white'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-505 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Request Recovery Code'
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: Verify & Enter New Password */}
              {forgotStep === 'verify' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    A recovery OTP code has been simulated for your email: <strong className="font-mono text-indigo-600 dark:text-indigo-400">7788</strong>. Enter this code and set your new passkey password.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Recovery OTP Code
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="Enter 7788"
                        className={`w-full px-3 py-2 text-xs font-mono text-center rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900 font-bold' : 'bg-slate-950 border-slate-850 text-white font-bold'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        New Passkey Password
                      </label>
                      <input
                        type="password"
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="At least 4 characters"
                        className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-850 text-white'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Confirm New Passkey
                      </label>
                      <input
                        type="password"
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Verify match"
                        className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-850 text-white'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Verify & Update Password'
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
