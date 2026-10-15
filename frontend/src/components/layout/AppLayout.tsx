import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logout } from '../../store/authSlice';
import '../../workspace.css';
export default function AppLayout() {
  const { user } = useAppSelector(s => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  return (
    <div className="pp-shell">
      <header className="pp-header">
        <Link className="pp-logo" to="/">
          profile<span>pays</span>
          <i>●</i>
        </Link>
        <nav aria-label="Main navigation">
          {user ? (
            <>
              <NavLink to={user.userType === 'advertiser' ? '/advertisers' : '/marketplace'}>
                {user.userType === 'advertiser' ? 'Campaign studio' : 'Discover'}
              </NavLink>
              <NavLink to="/placements">Placements</NavLink>
              <NavLink to="/earnings">Activity & credits</NavLink>
              <NavLink to="/connections">Connections</NavLink>
              {user.userType === 'admin' && <NavLink to="/reviews">Review queue</NavLink>}
            </>
          ) : (
            <>
              <NavLink to="/how-it-works">How it works</NavLink>
              <NavLink to="/about">Our story</NavLink>
            </>
          )}
        </nav>
        <div className="pp-account">
          <span className="pp-tag">TEST CREDIT EDITION</span>
          {user ? (
            <details>
              <summary>{user.firstName || 'Account'} ⌄</summary>
              <div>
                <small>{user.email}</small>
                <button
                  onClick={() => {
                    dispatch(logout());
                    navigate('/');
                  }}
                >
                  Sign out
                </button>
              </div>
            </details>
          ) : (
            <Link className="pp-button" to="/login">
              Sign in ↗
            </Link>
          )}
        </div>
      </header>
      <main className="pp-main">
        <Outlet />
      </main>
      <footer className="pp-footer">
        <div className="pp-logo">
          profile<span>pays</span>
        </div>
        <p>Your profile. Your choice. Your time.</p>
        <Link to="/how-it-works">How it works</Link>
        <small>Test credits have no cash value.</small>
      </footer>
    </div>
  );
}
