import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ArrowForwardIcon } from './icons';

type StepCardProps = {
  step: number;
  title: string;
  description: string;
};

const StepCard = ({ step, title, description }: StepCardProps) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h5" color="success.main" fontWeight={700}>
              {step < 10 ? `0${step}` : step}
            </Typography>
            <ArrowForwardIcon color="disabled" />
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default StepCard;
