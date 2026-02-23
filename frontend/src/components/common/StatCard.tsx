import { Card, CardContent, Stack, Typography } from '@mui/material';
import { CheckCircleFilledIcon, TrendingIcon, WalletOutlineIcon } from './icons';

export type StatCardVariant = 'campaigns' | 'wallet' | 'success';

type StatCardProps = {
  title: string;
  value: string;
  helperText?: string;
  variant?: StatCardVariant;
};

const variantIconMap: Record<StatCardVariant, JSX.Element> = {
  campaigns: <TrendingIcon color="success" fontSize="large" />,
  wallet: <WalletOutlineIcon color="success" fontSize="large" />,
  success: <CheckCircleFilledIcon color="success" fontSize="large" />,
};

const StatCard = ({ title, value, helperText, variant = 'success' }: StatCardProps) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {variantIconMap[variant]}
            <Typography variant="subtitle1" color="text.secondary">
              {title}
            </Typography>
          </Stack>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          {helperText ? (
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default StatCard;
