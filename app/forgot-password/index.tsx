import React, { FC } from 'react';
import ForgotPasswordComponent from '../../ForgotPassword';

interface ForgotPasswordProps {
  onGoToLogin: () => void;
}

const ForgotPassword: FC<ForgotPasswordProps> = ({ onGoToLogin }) => {
  return <ForgotPasswordComponent onGoToLogin={onGoToLogin} />;
};

export default ForgotPassword;

