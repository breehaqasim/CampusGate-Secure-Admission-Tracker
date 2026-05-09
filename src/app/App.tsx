import { useEffect, useRef, useState } from 'react';
import { RoleSelectionScreen } from './screens/RoleSelectionScreen';
import { StudentLoginScreen } from './screens/StudentLoginScreen';
import { StudentRegistrationScreen } from './screens/StudentRegistrationScreen';
import { UniversityAdminLoginScreen } from './screens/UniversityAdminLoginScreen';
import { UniversityAdminRegistrationScreen } from './screens/UniversityAdminRegistrationScreen';
import { StudentDashboardScreen } from './screens/StudentDashboardScreen';
import { UniversityDetailsScreen } from './screens/UniversityDetailsScreen';
import { UniversityAdminDashboardScreen } from './screens/UniversityAdminDashboardScreen';
import { AddEditUniversityScreen } from './screens/AddEditUniversityScreen';
import { SuperAdminLoginScreen } from './screens/SuperAdminLoginScreen';
import { SuperAdminDashboardScreen } from './screens/SuperAdminDashboardScreen';
import { logoutUser, isPasswordRecoveryHash } from './services/authService';
import { supabase } from '../lib/supabase';
import { SetNewPasswordScreen } from './screens/SetNewPasswordScreen';

type Screen =
  | 'role-selection'
  | 'set-new-password'
  | 'student-login'
  | 'student-registration'
  | 'student-dashboard'
  | 'university-details'
  | 'university-admin-login'
  | 'university-admin-registration'
  | 'university-admin-dashboard'
  | 'add-university'
  | 'edit-university'
  | 'super-admin-login'
  | 'super-admin-dashboard';

/** While on these screens, sign-in/sign-out events must not re-route globally — portals validate role locally. */
const PORTAL_FLOW_SCREENS: Screen[] = [
  'student-login',
  'student-registration',
  'university-admin-login',
  'university-admin-registration',
  'super-admin-login',
];

export default function App() {
  /** Auto sign-out after no user input (mousemove, keydown, click, scroll, touch). */
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
  const [currentScreen, setCurrentScreen] = useState<Screen>('role-selection');
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const currentScreenRef = useRef<Screen>(currentScreen);
  /** While true, ignore auth routing so PASSWORD_RECOVERY / reset UI is not overwritten by INITIAL_SESSION. */
  const passwordRecoveryFlowRef = useRef(false);
  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  const getScreenByProfile = (profile: any): Screen => {
    const role = String(profile?.role || '').toLowerCase();
    const approved = Boolean(profile?.approved);

    if (role === 'student') return 'student-dashboard';
    if (role === 'super-admin' || role === 'super_admin') return 'super-admin-dashboard';
    if (role === 'university-admin' || role === 'university_admin') {
      return approved ? 'university-admin-dashboard' : 'university-admin-login';
    }

    return 'role-selection';
  };

  const resolveSessionScreen = async (user: any) => {
    if (!user) {
      setCurrentScreen('role-selection');
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, approved')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        setCurrentScreen(getScreenByProfile(profile));
        return;
      }

      setCurrentScreen(getScreenByProfile(user?.user_metadata || {}));
    } catch (error) {
      console.error(error);
      setCurrentScreen('role-selection');
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
    });

    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  };

  useEffect(() => {
    let isMounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Password recovery email link — must not route by profile (often lands on role-selection).
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryFlowRef.current = true;
        setCurrentScreen('set-new-password');
        setIsSessionLoading(false);
        return;
      }

      // Same-tab recovery: INITIAL_SESSION may run before PASSWORD_RECOVERY while hash still has type=recovery.
      if (event === 'INITIAL_SESSION' && session?.user && typeof window !== 'undefined') {
        if (isPasswordRecoveryHash()) {
          passwordRecoveryFlowRef.current = true;
          setCurrentScreen('set-new-password');
          setIsSessionLoading(false);
          return;
        }
      }

      if (passwordRecoveryFlowRef.current) {
        return;
      }

      const portalScreen = currentScreenRef.current;
      const onPortalFlow = PORTAL_FLOW_SCREENS.includes(portalScreen);

      if (onPortalFlow && session?.user) {
        return;
      }

      if (onPortalFlow && !session?.user) {
        return;
      }

      resolveSessionScreen(session?.user || null);
    });

    const bootstrapSession = async () => {
      try {
        // Read hash before async work — detectSessionInUrl may strip it after getSession().
        const recoveryFromUrl =
          typeof window !== 'undefined' && isPasswordRecoveryHash();

        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          4000,
          { data: { session: null } } as any
        );
        if (!isMounted) return;

        const session = sessionResult.data?.session;
        if (session?.user && recoveryFromUrl) {
          passwordRecoveryFlowRef.current = true;
          setCurrentScreen('set-new-password');
          setIsSessionLoading(false);
          return;
        }

        setIsSessionLoading(false);
        resolveSessionScreen(session?.user || null);
      } finally {
        if (isMounted) setIsSessionLoading(false);
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const clearExistingTimeout = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
    };

    const scheduleTimeout = () => {
      clearExistingTimeout();
      inactivityTimeout = setTimeout(async () => {
        if (!isMounted) return;
        if (currentScreenRef.current === 'set-new-password') return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await supabase.auth.signOut({ scope: 'global' });
          setFavorites([]);
          setSelectedUniversityId('');
          setCurrentScreen('role-selection');
          alert('You were logged out due to inactivity.');
        }
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ];

    events.forEach((eventName) => window.addEventListener(eventName, scheduleTimeout));
    scheduleTimeout();

    return () => {
      isMounted = false;
      clearExistingTimeout();
      events.forEach((eventName) => window.removeEventListener(eventName, scheduleTimeout));
    };
  }, [currentScreen]);

  const handleRoleSelect = (role: 'student' | 'university-admin' | 'super-admin') => {
    if (role === 'student') {
      setCurrentScreen('student-login');
    } else if (role === 'university-admin') {
      setCurrentScreen('university-admin-login');
    } else if (role === 'super-admin') {
      setCurrentScreen('super-admin-login');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error(error);
    } finally {
      setFavorites([]);
      setSelectedUniversityId('');
      setCurrentScreen('role-selection');
    }
  };

  const handleViewUniversity = (universityId: string) => {
    setSelectedUniversityId(universityId);
    setCurrentScreen('university-details');
  };

  const handleSaveToFavorites = (university: any) => {
    setFavorites(prev => {
      const exists = prev.find(fav => fav.id === university.id);
      if (exists) {
        return prev.filter(fav => fav.id !== university.id);
      } else {
        return [...prev, university];
      }
    });
  };

  const handleRemoveFromFavorites = (universityId: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== universityId));
  };

  const isUniversityFavorite = (universityId: string) => {
    return favorites.some(fav => fav.id === universityId);
  };

  const handlePasswordRecoveryDone = () => {
    passwordRecoveryFlowRef.current = false;
    setFavorites([]);
    setSelectedUniversityId('');
    setCurrentScreen('role-selection');
  };

  const handleCancelPasswordRecovery = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    } finally {
      passwordRecoveryFlowRef.current = false;
      setCurrentScreen('role-selection');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'set-new-password':
        return (
          <SetNewPasswordScreen onDone={handlePasswordRecoveryDone} onCancel={handleCancelPasswordRecovery} />
        );

      case 'role-selection':
        return <RoleSelectionScreen onSelectRole={handleRoleSelect} />;

      case 'student-login':
        return (
          <StudentLoginScreen
            onBack={() => setCurrentScreen('role-selection')}
            onSignUpClick={() => setCurrentScreen('student-registration')}
            onLogin={() => setCurrentScreen('student-dashboard')}
          />
        );

      case 'student-registration':
        return (
          <StudentRegistrationScreen
            onBack={() => setCurrentScreen('student-login')}
            onLoginClick={() => setCurrentScreen('student-login')}
            onSignUp={() => setCurrentScreen('student-dashboard')}
          />
        );

      case 'student-dashboard':
        return (
          <StudentDashboardScreen
            onLogout={handleLogout}
            onViewUniversity={handleViewUniversity}
            favorites={favorites}
            onRemoveFromFavorites={handleRemoveFromFavorites}
          />
        );

      case 'university-details':
        return (
          <UniversityDetailsScreen
            universityId={selectedUniversityId}
            onBack={() => setCurrentScreen('student-dashboard')}
            onLogout={handleLogout}
            onSaveToFavorites={handleSaveToFavorites}
            isFavorite={isUniversityFavorite(selectedUniversityId)}
          />
        );

      case 'university-admin-login':
        return (
          <UniversityAdminLoginScreen
            onBack={() => setCurrentScreen('role-selection')}
            onRegisterClick={() => setCurrentScreen('university-admin-registration')}
            onLogin={() => setCurrentScreen('university-admin-dashboard')}
          />
        );

      case 'university-admin-registration':
        return (
          <UniversityAdminRegistrationScreen
            onBack={() => setCurrentScreen('university-admin-login')}
            onLoginClick={() => setCurrentScreen('university-admin-login')}
          />
        );

      case 'university-admin-dashboard':
        return (
          <UniversityAdminDashboardScreen
            onLogout={handleLogout}
          />
        );

      case 'add-university':
        return (
          <AddEditUniversityScreen
            onBack={() => setCurrentScreen('university-admin-dashboard')}
            onSave={() => setCurrentScreen('university-admin-dashboard')}
          />
        );

      case 'edit-university':
        return (
          <AddEditUniversityScreen
            universityId={selectedUniversityId}
            onBack={() => setCurrentScreen('university-admin-dashboard')}
            onSave={() => setCurrentScreen('university-admin-dashboard')}
          />
        );

      case 'super-admin-login':
        return (
          <SuperAdminLoginScreen
            onBack={() => setCurrentScreen('role-selection')}
            onLogin={() => setCurrentScreen('super-admin-dashboard')}
          />
        );

      case 'super-admin-dashboard':
        return (
          <SuperAdminDashboardScreen
            onLogout={handleLogout}
          />
        );

      default:
        return <RoleSelectionScreen onSelectRole={handleRoleSelect} />;
    }
  };

  const isAuthScreen = [
    'role-selection',
    'set-new-password',
    'student-login',
    'student-registration',
    'university-admin-login',
    'university-admin-registration',
    'super-admin-login',
    'add-university',
    'edit-university',
  ].includes(currentScreen);

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] dark flex items-center justify-center">
        <p className="text-[#a0a0a0] text-sm">Restoring session...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] dark ${
      isAuthScreen ? 'flex items-center justify-center p-6' : ''
    } relative`}>
      {renderScreen()}
    </div>
  );
}