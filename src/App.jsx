import React, { useState } from 'react';
import { ROLES } from './core/models/enums.js';
import { AppointmentCalendar } from './features/appointments/components/AppointmentCalendar.jsx';
import { AuthModal } from './features/auth/components/AuthModal.jsx';
import { AuthProvider } from './features/auth/context/AuthContext.jsx';
import { useAuth } from './features/auth/context/useAuth.js';
import { ClinicalJournal } from './features/clinical-log/components/ClinicalJournal.jsx';
import { PatientDirectory } from './features/patients/components/PatientDirectory.jsx';
import { PatientPortal } from './features/patient-portal/components/PatientPortal.jsx';
import { cx } from './shared/utils/cx.js';
import './App.css';

function AppLayout() {
  const { user, role, isAuthenticated, logout } = useAuth();

  const [activePsychologistTab, setActivePsychologistTab] = useState('appointments');
  const [activePatientTab, setActivePatientTab] = useState('appointments');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authReasonMessage, setAuthReasonMessage] = useState(null);

  const isPsychologistSession = isAuthenticated && role === ROLES.PSYCHOLOGIST;
  const isPatientSession = isAuthenticated && role === ROLES.PATIENT;

  const openAuthModal = (reason = null) => {
    setAuthReasonMessage(typeof reason === 'string' ? reason : null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthReasonMessage(null);
  };

  const handleAuthAction = async () => {
    if (isAuthenticated) {
      await logout();
    } else {
      openAuthModal(null);
    }
  };

  const renderPsychologistView = () => {
    switch (activePsychologistTab) {
      case 'patients':
        return <PatientDirectory />;
      case 'clinical-log':
        return <ClinicalJournal />;
      case 'appointments':
      default:
        return <AppointmentCalendar />;
    }
  };

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brandGroup">
          <span className="brandLogo">PsicoApp</span>
        </div>

        <div className="controlsRow">
          {/* Navegación exclusiva cuando hay sesión de Psicóloga */}
          {isPsychologistSession && (
            <nav className="moduleNav" aria-label="Módulos del panel clínico">
              <button
                type="button"
                className={cx(
                  'tabBtn',
                  activePsychologistTab === 'appointments' && 'tabBtnActive',
                )}
                onClick={() => setActivePsychologistTab('appointments')}
              >
                Agenda de Consultas
              </button>
              <button
                type="button"
                className={cx(
                  'tabBtn',
                  activePsychologistTab === 'clinical-log' && 'tabBtnActive',
                )}
                onClick={() => setActivePsychologistTab('clinical-log')}
              >
                Bitácora Clínica
              </button>
              <button
                type="button"
                className={cx(
                  'tabBtn',
                  activePsychologistTab === 'patients' && 'tabBtnActive',
                )}
                onClick={() => setActivePsychologistTab('patients')}
              >
                Directorio de Pacientes
              </button>
            </nav>
          )}

          {/* Navegación exclusiva cuando hay sesión de Paciente */}
          {isPatientSession && (
            <nav className="moduleNav" aria-label="Secciones del portal del paciente">
              <button
                type="button"
                className={cx(
                  'tabBtn',
                  activePatientTab === 'appointments' && 'tabBtnActive',
                )}
                onClick={() => setActivePatientTab('appointments')}
              >
                Mis Citas / Agendar
              </button>
              <button
                type="button"
                className={cx(
                  'tabBtn',
                  activePatientTab === 'profile' && 'tabBtnActive',
                )}
                onClick={() => setActivePatientTab('profile')}
              >
                Mi Perfil
              </button>
              <button
                type="button"
                className={cx(
                  'tabBtn',
                  activePatientTab === 'resources' && 'tabBtnActive',
                )}
                onClick={() => setActivePatientTab('resources')}
              >
                Recursos Educativos
              </button>
            </nav>
          )}

          {/* Usuario autenticado o Botón de Iniciar Sesión */}
          <div className="authStatusGroup">
            {isAuthenticated && user && (
              <span className="sessionUserLabel" title={user.email}>
                {user.fullName}
              </span>
            )}

            <button
              type="button"
              className={cx('authActionBtn', isAuthenticated && 'authActionBtnLogout')}
              onClick={handleAuthAction}
            >
              {isAuthenticated ? 'Cerrar Sesión' : 'Iniciar Sesión'}
            </button>
          </div>
        </div>
      </header>

      <main className="mainContent">
        {isPsychologistSession ? (
          renderPsychologistView()
        ) : (
          <PatientPortal
            activeTab={activePatientTab}
            onTabChange={setActivePatientTab}
            onRequireAuth={(reason) => openAuthModal(reason)}
          />
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        reasonMessage={authReasonMessage}
        onClose={closeAuthModal}
        onAuthSuccess={(loggedUser) => {
          if (loggedUser?.role === ROLES.PSYCHOLOGIST) {
            setActivePsychologistTab('appointments');
          } else {
            setActivePatientTab('appointments');
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
