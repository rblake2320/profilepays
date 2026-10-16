import * as yup from 'yup';
import { PASSWORD_MIN, PASSWORD_MAX, PASSWORD_PATTERN, PASSWORD_HELP, NAME_PATTERN, NAME_HELP } from '../../../backend/src/auth/signup-policy';

export const signupSchema = yup.object({
  email: yup.string().trim().email('Enter a valid email address').max(255, 'Email must not exceed 255 characters').required('Email is required'),
  password: yup
    .string()
    .min(PASSWORD_MIN, 'Password must be at least 8 characters')
    .max(PASSWORD_MAX, 'Password must not exceed 128 characters')
    .matches(PASSWORD_PATTERN, PASSWORD_HELP)
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  userType: yup.string().oneOf(['member', 'advertiser']).required('Please select account type'),
  firstName: yup.string().trim().required('First name is required').max(100, 'First name must not exceed 100 characters').matches(NAME_PATTERN, NAME_HELP),
  lastName: yup.string().trim().required('Last name is required').max(100, 'Last name must not exceed 100 characters').matches(NAME_PATTERN, NAME_HELP),
  companyName: yup.string().trim().max(200, 'Company name must not exceed 200 characters').when('userType', {
    is: 'advertiser',
    then: (s) => s.required('Company name is required for advertisers'),
    otherwise: (s) => s.optional(),
  }),
});

