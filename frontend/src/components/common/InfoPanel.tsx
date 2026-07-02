import { Card, CardContent, Stack, Typography } from '@mui/material';
import { InfoCircleIcon } from './icons';

type InfoPanelProps = {
  title: string;
  items: string[];
};

const InfoPanel = ({ title, items }: InfoPanelProps) => {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InfoCircleIcon color="success" />
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
          </Stack>
          <Stack component="ul" spacing={1.5} sx={{ m: 0, pl: 2 }}>
            {items.map(item => (
              <Typography component="li" variant="body2" color="text.secondary" key={item}>
                {item}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default InfoPanel;
