import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import HomePage from '../HomePage';
import theme from '../../theme';

const renderHomePage = () =>
  render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('HomePage', () => {
  it('renders hero copy and actions', () => {
    renderHomePage();
    // Hero headline — split across elements, use getAllByText or partial match
    expect(screen.getByText(/Turn your profile picture into/i)).toBeTruthy();
    // CTA buttons (may appear multiple times due to multiple CTA sections)
    expect(screen.getAllByText(/Start Earning/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Advertise with Us/i).length).toBeGreaterThan(0);
  });

  it('renders countdown timer', () => {
    renderHomePage();
    expect(screen.getByText(/Time Remaining Before Next Payout/i)).toBeTruthy();
  });

  it('renders marketplace stats', () => {
    renderHomePage();
    // StatCard uses 'title' prop which renders as subtitle1 text
    expect(screen.getByText(/Active advertisers/i)).toBeTruthy();
    expect(screen.getByText(/Total paid out/i)).toBeTruthy();
  });

  it('renders trusted brands section', () => {
    renderHomePage();
    expect(screen.getByText(/Trusted by brands including/i)).toBeTruthy();
  });
});
