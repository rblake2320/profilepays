import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { register as registerAction } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';

interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  userType: string;
  firstName: string;
  lastName: string;
}

const RegisterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<RegisterFormData>({
    defaultValues: {
      userType: 'member',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    const result = await dispatch(registerAction(registerData));
    if (registerAction.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={600} textAlign="center">
        Create Account
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
        Join ProfilePays and start earning today
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="First Name"
            fullWidth
            margin="normal"
            {...register('firstName')}
          />
          <TextField
            label="Last Name"
            fullWidth
            margin="normal"
            {...register('lastName')}
          />
        </Box>

        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          error={!!errors.email}
          helperText={errors.email?.message}
        />

        <TextField
          label="Username"
          fullWidth
          margin="normal"
          {...register('username', {
            required: 'Username is required',
            minLength: { value: 3, message: 'Username must be at least 3 characters' },
          })}
          error={!!errors.username}
          helperText={errors.username?.message}
        />

        <Controller
          name="userType"
          control={control}
          rules={{ required: 'User type is required' }}
          render={({ field }) => (
            <FormControl fullWidth margin="normal">
              <InputLabel>I am a...</InputLabel>
              <Select {...field} label="I am a...">
                <MenuItem value="member">Creator (Earn from campaigns)</MenuItem>
                <MenuItem value="business">Business (Create campaigns)</MenuItem>
              </Select>
            </FormControl>
          )}
        />

        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Password must be at least 8 characters' },
          })}
          error={!!errors.password}
          helperText={errors.password?.message}
        />

        <TextField
          label="Confirm Password"
          type="password"
          fullWidth
          margin="normal"
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={isLoading}
          sx={{ mt: 3 }}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login">
            Login
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default RegisterPage;
