import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from '../HomePage';
import theme from '../../theme';

describe('HomePage', () => {
  it('renders hero copy and actions', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(markup).toContain('Turn your profile into profit');
    expect(markup).toContain('Advertisers Sign Up');
    expect(markup).toContain('Everyone Else Sign Up');
    expect(markup).toContain('Time Remaining Before Next Payout');
  });
});
