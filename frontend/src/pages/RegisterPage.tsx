import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { registerUser, clearError } from '../store/authSlice';
import { PASSWORD_HELP } from '../../../backend/src/auth/signup-policy';
import { signupSchema as schema } from '../validation/signup';


type FormData = yup.InferType<typeof schema>;

const RegisterPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, error, user } = useAppSelector((s) => s.auth);

  const defaultType = searchParams.get('type') === 'advertiser' ? 'advertiser' : 'member';

  const {
    register,
    handleSubmit,
    watch,
    control,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: { userType: defaultType },
  });

  const userType = watch('userType');

  useEffect(() => {
    if (user) {
      navigate(user.userType === 'advertiser' ? '/advertisers' : '/marketplace', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const onSubmit = async (data: FormData) => {
    const { confirmPassword, ...payload } = data;
    try {
      await dispatch(registerUser(payload as any)).unwrap();
    } catch (failure: any) {
      let focused = false;
      for (const [name, message] of Object.entries(failure?.fieldErrors || {})) {
        if (['email', 'password', 'firstName', 'lastName', 'companyName'].includes(name) && typeof message === 'string') {
          setError(name as keyof FormData, { type: 'server', message }, { shouldFocus: !focused });
          focused = true;
        }
      }
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" py={4}>
      <Card sx={{ width: '100%', maxWidth: 500 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                Create your account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Join ProfilePays and start earning or advertising today
              </Typography>
            </Stack>

            {error && (
              <Alert severity="error" onClose={() => dispatch(clearError())}>
                {error}
              </Alert>
            )}

            <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                {/* Account type selector */}
                <Controller
                  name="userType"
                  control={control}
                  render={({ field }) => (
                    <FormControl error={!!errors.userType}>
                      <FormLabel>Account type</FormLabel>
                      <RadioGroup row {...field}>
                        <FormControlLabel
                          value="member"
                          control={<Radio color="success" />}
                          label="Participant (test credits)"
                        />
                        <FormControlLabel
                          value="advertiser"
                          control={<Radio color="success" />}
                          label="Advertiser (run campaigns)"
                        />
                      </RadioGroup>
                      {errors.userType && (
                        <FormHelperText>{errors.userType.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="First name"
                    autoComplete="given-name"
                    fullWidth
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                    {...register('firstName')}
                  />
                  <TextField
                    label="Last name"
                    autoComplete="family-name"
                    fullWidth
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                    {...register('lastName')}
                  />
                </Stack>

                {userType === 'advertiser' && (
                  <TextField
                    label="Company name"
                    fullWidth
                    error={!!errors.companyName}
                    helperText={errors.companyName?.message}
                    {...register('companyName')}
                  />
                )}

                <TextField
                  label="Email address"
                  type="email"
                  fullWidth
                  autoComplete="email"
                  inputProps={{ autoCapitalize: 'none', spellCheck: false, inputMode: 'email' }}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  {...register('email')}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  autoComplete="new-password"
                  error={!!errors.password}
                  helperText={errors.password?.message || PASSWORD_HELP}
                  {...register('password')}
                />
                <TextField
                  label="Confirm password"
                  type="password"
                  fullWidth
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  size="large"
                  fullWidth
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {isLoading ? 'Creating account…' : 'Create account'}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" color="success.main">
                Sign in
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterPage;
