import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';

export type AdCardProps = {
  title: string;
  category: string;
  payout: string;
  image?: string;
  selected?: boolean;
  onSelect?: () => void;
};

const AdCard = ({ title, category, payout, image, selected, onSelect }: AdCardProps) => {
  return (
    <Card
      sx={{
        height: '100%',
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'success.main' : 'divider',
        transition: theme => theme.transitions.create(['transform', 'box-shadow']),
        transform: selected ? 'translateY(-4px)' : 'none',
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ height: '100%' }}>
        <Stack height="100%" justifyContent="space-between">
          <Stack spacing={2}>
            <BoxPlaceholder image={image} category={category} />
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600}>
                    {title}
                  </Typography>
                  <Chip label={payout} color="success" size="small" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Sponsored placement in {category} vertical.
                </Typography>
              </Stack>
            </CardContent>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
};

type BoxPlaceholderProps = {
  image?: string;
  category: string;
};

const BoxPlaceholder = ({ image, category }: BoxPlaceholderProps) => {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{
        backgroundImage: image ? `url(${image})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 2,
        height: 140,
        m: 2,
        border: '1px dashed',
        borderColor: 'divider',
        color: 'text.secondary',
        fontWeight: 600,
      }}
    >
      {!image ? `${category} creative` : null}
    </Stack>
  );
};

export default AdCard;
