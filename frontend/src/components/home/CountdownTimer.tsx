import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

type CountdownTimerProps = {
  durationInMinutes?: number;
};

const CountdownTimer = ({ durationInMinutes = 5 }: CountdownTimerProps) => {
  const theme = useTheme();
  const [secondsRemaining, setSecondsRemaining] = useState(durationInMinutes * 60);

  useEffect(() => {
    setSecondsRemaining(durationInMinutes * 60);

    const interval = window.setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          return durationInMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [durationInMinutes]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [secondsRemaining]);

  return (
    <Box
      sx={{
        borderRadius: 4,
        background: `linear-gradient(145deg, ${theme.palette.success.dark}, ${theme.palette.primary.main})`,
        color: 'common.white',
        p: 4,
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" component="p" fontWeight={700} letterSpacing={1.5}>
        {formattedTime}
      </Typography>
      <Typography variant="subtitle1" mt={1}>
        Time Remaining Before Next Payout
      </Typography>
    </Box>
  );
};

export default CountdownTimer;
