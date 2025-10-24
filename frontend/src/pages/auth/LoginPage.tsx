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
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { login } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    const result = await dispatch(login(data));
    if (login.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={600} textAlign="center">
        Welcome Back
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
        Login to your ProfilePays account
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
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
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          {...register('password', { required: 'Password is required' })}
          error={!!errors.password}
          helperText={errors.password?.message}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={isLoading}
          sx={{ mt: 3 }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link component={RouterLink} to="/register">
            Sign up
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
